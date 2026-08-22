#!/usr/bin/env python3
"""
COORDINADOR — SISTEMA DE GESTION DE MANTENIMIENTO
Centro de control para gestion de contenedores Docker del proyecto.

Servicios (docker-compose):
  mongodb        — Base de datos  (volumen: mongo_data)       -> mmtto-mongodb
  backend-server — Parse Server   (interno :1337)              -> mmtto-backend
  frontend       — Next.js        (interno :3000)              -> mmtto-frontend
  mongo-express  — Admin MongoDB  (via nginx /mongo-admin/)    -> mmtto-mongo-express
  nginx          — Reverse proxy  (host :5771)                 -> mmtto-nginx

Uso directo (sin menu):
  python coordinador.py <opcion>
  Ej: python coordinador.py 4   -> rebuild solo backend
"""

import os
import sys
import subprocess
import time
from pathlib import Path


# ─────────────────────────────────────────────────────────────────────────────
# Terminal
# ─────────────────────────────────────────────────────────────────────────────
class C:
    GREEN  = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED    = '\033[0;31m'
    BLUE   = '\033[0;34m'
    CYAN   = '\033[0;36m'
    BOLD   = '\033[1m'
    NC     = '\033[0m'


def log(msg):   print(f"{C.BLUE}[INFO]{C.NC}  {msg}")
def ok(msg):    print(f"{C.GREEN}[OK]{C.NC}    {msg}")
def warn(msg):  print(f"{C.YELLOW}[WARN]{C.NC}  {msg}")
def err(msg):   print(f"{C.RED}[ERROR]{C.NC} {msg}")


def header(title):
    print(f"\n{C.CYAN}{'='*58}{C.NC}")
    print(f"{C.CYAN}  {title}{C.NC}")
    print(f"{C.CYAN}{'='*58}{C.NC}\n")


def clear():
    os.system('cls' if os.name == 'nt' else 'clear')


def pause():
    input(f"\n{C.YELLOW}Presiona Enter para continuar...{C.NC}")


# ─────────────────────────────────────────────────────────────────────────────
# Shell
# ─────────────────────────────────────────────────────────────────────────────
def run(cmd: str, show: bool = True) -> tuple[bool, str]:
    """Ejecuta comando shell. Retorna (exito, salida)."""
    try:
        if show:
            print(f"\n{C.BLUE}>> {cmd}{C.NC}")
            subprocess.run(cmd, shell=True, check=True, text=True)
            return True, ""
        else:
            result = subprocess.run(cmd, shell=True, capture_output=True,
                                    text=True, check=True)
            return True, result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return False, (e.stderr or "").strip()
    except Exception as e:
        return False, str(e)


# ─────────────────────────────────────────────────────────────────────────────
# Coordinador
# ─────────────────────────────────────────────────────────────────────────────
class Coordinador:

    SERVICIOS = ['mongodb', 'backend-server', 'frontend', 'mongo-express', 'nginx']

    def __init__(self):
        if 'DOCKER_HOST' in os.environ:
            warn(f"Limpiando DOCKER_HOST ({os.environ['DOCKER_HOST']}) -> Docker Desktop local")
            del os.environ['DOCKER_HOST']

        os.environ['DOCKER_BUILDKIT']          = '0'
        os.environ['COMPOSE_DOCKER_CLI_BUILD'] = '0'

        self.root    = Path(__file__).parent.parent.resolve()
        self.compose = self.root / 'docker-compose.yml'
        self._dc_cmd = None

    @property
    def dc(self) -> str:
        if self._dc_cmd:
            return self._dc_cmd
        for candidate in ['docker compose', 'docker-compose']:
            ok_cmd, _ = run(f'{candidate} version', show=False)
            if ok_cmd:
                self._dc_cmd = candidate
                return self._dc_cmd
        err("Docker Compose no encontrado.")
        sys.exit(1)

    def _run(self, args: str, show: bool = True) -> tuple[bool, str]:
        return run(f'{self.dc} -f "{self.compose}" {args}', show=show)

    def _tail(self, servicio: str, lines: int = 25):
        print(f"\n{C.BLUE}--- ultimas lineas de {servicio} ---{C.NC}")
        self._run(f'logs --tail={lines} {servicio}')
        print()

    def _urls(self):
        print(f"\n{C.CYAN}{'─'*45}{C.NC}")
        print(f"{C.GREEN}  URLs de acceso:{C.NC}")
        print(f"  - App:           http://localhost:5771")
        print(f"  - API Parse:     http://localhost:5771/api/parse")
        print(f"  - Mongo Express: http://localhost:5771/mongo-admin/")
        print(f"{C.CYAN}{'─'*45}{C.NC}\n")

    def check(self) -> bool:
        log("Verificando prerrequisitos...")
        if not self.compose.exists():
            err(f"docker-compose.yml no encontrado en {self.root}")
            return False
        ok_d, ver = run('docker --version', show=False)
        if not ok_d:
            err("Docker no disponible. Inicia Docker Desktop.")
            return False
        log(f"Docker: {ver}")
        ok_r, _ = run('docker info', show=False)
        if not ok_r:
            err("Docker no esta ejecutandose. Inicia Docker Desktop.")
            return False
        log(f"Compose: {self.dc}  |  Raiz: {self.root}")
        ok("Prerrequisitos OK")
        return True

    # ─────────────────────────────────────────────────────────────────────────
    # ACCIONES
    # ─────────────────────────────────────────────────────────────────────────

    def rebuild_todo(self):
        """1 — Down -> build sin cache -> up"""
        header("REBUILD COMPLETO")
        self._run('down --remove-orphans')
        ok_b, _ = self._run('build --no-cache')
        if not ok_b:
            err("Fallo en build."); return
        self._run('up -d')
        time.sleep(8)
        self.estado(pause_=False)
        self._urls()
        ok("Rebuild completo listo.")

    def actualizar(self):
        """2 — Down -> up (sin rebuild)"""
        header("ACTUALIZAR SIN REBUILD")
        self._run('down --remove-orphans')
        self._run('up -d')
        time.sleep(5)
        self.estado(pause_=False)

    def reiniciar_todo(self):
        """3 — Restart de todos los servicios"""
        header("REINICIAR TODOS LOS SERVICIOS")
        self._run('restart')
        time.sleep(5)
        self.estado(pause_=False)

    def rebuild_backend(self):
        """4 — Rebuild SOLO backend-server"""
        header("REBUILD SOLO BACKEND (Parse Server)")
        self._run('stop backend-server')
        ok_b, _ = self._run('build --no-cache backend-server')
        if not ok_b:
            err("Fallo en build del backend."); return
        self._run('up -d backend-server')
        time.sleep(8)
        self._tail('backend-server')
        ok("Backend actualizado.")

    def rebuild_frontend(self):
        """5 — Rebuild SOLO frontend"""
        header("REBUILD SOLO FRONTEND (Next.js)")
        self._run('stop frontend nginx')
        ok_b, _ = self._run('build --no-cache frontend')
        if not ok_b:
            err("Fallo en build del frontend."); return
        self._run('up -d frontend nginx')
        time.sleep(8)
        self._tail('frontend')
        ok("Frontend actualizado.")

    def reiniciar_nginx(self):
        """6 — Reiniciar nginx"""
        header("REINICIAR NGINX")
        self._run('restart nginx')
        time.sleep(3)
        self._tail('nginx', lines=10)
        ok("Nginx reiniciado.")

    def reiniciar_mongo_express(self):
        """7 — Reiniciar mongo-express"""
        header("REINICIAR MONGO-EXPRESS")
        self._run('restart mongo-express')
        time.sleep(5)
        self._tail('mongo-express', lines=10)
        ok("Mongo Express reiniciado.")

    # ── Cargar datos ──────────────────────────────────────────────────────────

    def cargar_establecimientos(self):
        """14 — Cargar establecimientos desde Excel"""
        header("CARGAR ESTABLECIMIENTOS DESDE EXCEL")
        script = self.root / 'scripts' / 'load_data_ss.py'
        if not script.exists():
            err(f"Script no encontrado: {script}"); return
        log("Ejecutando carga de establecimientos...")
        success, _ = run(f'python "{script}"')
        if success:
            ok("Carga de establecimientos completada.")
        else:
            err("Error en la carga de establecimientos.")

    # ── Estado y logs ─────────────────────────────────────────────────────────

    def estado(self, pause_: bool = True):
        """8 — Estado de todos los servicios"""
        header("ESTADO DE SERVICIOS")
        self._run('ps')
        print()
        run('docker stats --no-stream --format '
            '"table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"')
        if pause_:
            pause()

    def ver_logs(self):
        """9 — Logs en tiempo real"""
        header("LOGS EN TIEMPO REAL")
        print(f"{C.YELLOW}Servicios:{C.NC}")
        for i, s in enumerate(self.SERVICIOS, 1):
            print(f"  {i}. {s}")
        print("  0. Todos")
        print()
        sel = input("Servicio (numero): ").strip()
        try:
            idx = int(sel)
            svc = self.SERVICIOS[idx - 1] if 1 <= idx <= len(self.SERVICIOS) else ''
        except ValueError:
            svc = ''

        cmd = f'{self.dc} -f "{self.compose}" logs -f'
        if svc:
            cmd += f' {svc}'
        log(f"Mostrando logs de {'todos' if not svc else svc} (Ctrl+C para salir)...")
        try:
            subprocess.run(cmd, shell=True)
        except KeyboardInterrupt:
            print("\nSaliendo de logs.")

    # ── Gestion ───────────────────────────────────────────────────────────────

    def parar(self):
        """10 — Parar todos"""
        header("PARAR SERVICIOS")
        self._run('down --remove-orphans')
        ok("Servicios detenidos. Volumenes preservados.")

    def levantar(self):
        """11 — Levantar todos"""
        header("LEVANTAR SERVICIOS")
        self._run('up -d')
        time.sleep(5)
        self.estado(pause_=False)

    def reset_total(self):
        """12 — Down -v -> build -> up (borra MongoDB)"""
        header("RESET TOTAL — BORRA VOLUMEN MONGODB")
        print(f"{C.RED}ADVERTENCIA: elimina mongo_data y reinicializa la BD.{C.NC}")
        if input("Escribe CONFIRMAR para continuar: ").strip() != 'CONFIRMAR':
            warn("Cancelado."); return
        self._run('down -v --remove-orphans')
        ok_b, _ = self._run('build --no-cache')
        if not ok_b:
            err("Fallo en build."); return
        self._run('up -d')
        time.sleep(12)
        self.estado(pause_=False)
        ok("Reset total completado. MongoDB reinicializado.")
        self._urls()

    def limpiar_docker(self):
        """13 — Prune de imagenes, contenedores y cache"""
        header("LIMPIEZA DOCKER")
        run('docker system df')
        if input("\nConfirmar limpieza? (s/N): ").strip().lower() != 's':
            warn("Cancelado."); return
        for msg, cmd in [
            ("Contenedores...", 'docker container prune -f'),
            ("Imagenes...",     'docker image prune -a -f'),
            ("Volumenes...",    'docker volume prune -f'),
            ("Redes...",        'docker network prune -f'),
            ("Cache build...",  'docker builder prune -a -f'),
        ]:
            log(msg); run(cmd)
        print()
        run('docker system df')
        ok("Limpieza completada.")

    def rescate(self):
        """r — Rescate: inicia servicios en orden de dependencia"""
        header("RESCATE RAPIDO")
        self._run('down --remove-orphans')
        run('docker container prune -f', show=False)

        orden = [
            ('mongodb',        15, True),
            ('backend-server', 10, True),
            ('frontend',        8, False),
            ('mongo-express',   5, False),
            ('nginx',           3, False),
        ]
        for svc, espera, critico in orden:
            log(f"Iniciando {svc}...")
            ok_s, _ = self._run(f'up -d {svc}')
            if not ok_s and critico:
                err(f"Fallo critico en {svc}. Abortando."); return
            elif not ok_s:
                warn(f"Problema con {svc}, continuando...")
            else:
                time.sleep(espera)

        time.sleep(5)
        self.estado(pause_=False)
        ok("Rescate completado.")
        self._urls()

    # ─────────────────────────────────────────────────────────────────────────
    # MENU
    # ─────────────────────────────────────────────────────────────────────────

    MAPA = {
        '1':  'rebuild_todo',
        '2':  'actualizar',
        '3':  'reiniciar_todo',
        '4':  'rebuild_backend',
        '5':  'rebuild_frontend',
        '6':  'reiniciar_nginx',
        '7':  'reiniciar_mongo_express',
        '8':  'estado',
        '9':  'ver_logs',
        '10': 'parar',
        '11': 'levantar',
        '12': 'reset_total',
        '13': 'limpiar_docker',
        '14': 'cargar_establecimientos',
        'r':  'rescate',
    }

    def _mostrar_menu(self):
        clear()
        print(f"{C.CYAN}+{'='*56}+{C.NC}")
        print(f"{C.CYAN}|   COORDINADOR — GESTION DE MANTENIMIENTO{' '*15}|{C.NC}")
        print(f"{C.CYAN}+{'='*56}+{C.NC}")
        lineas = [
            ("DESPLIEGUE COMPLETO", None),
            (" 1", "Rebuild completo         (down -> build -> up)"),
            (" 2", "Actualizar sin rebuild   (down -> up)"),
            (" 3", "Reiniciar todos"),
            (" r", "Rescate rapido           (por orden de dependencia)"),
            ("REBUILD SELECTIVO", None),
            (" 4", "Rebuild solo BACKEND     (Parse Server)"),
            (" 5", "Rebuild solo FRONTEND    (Next.js)"),
            (" 6", "Reiniciar nginx          (aplica default.conf)"),
            (" 7", "Reiniciar mongo-express"),
            ("ESTADO Y LOGS", None),
            (" 8", "Estado de servicios"),
            (" 9", "Logs en tiempo real"),
            ("DATOS", None),
            ("14", "Cargar establecimientos  (desde Excel)"),
            ("GESTION", None),
            ("10", "Parar todos"),
            ("11", "Levantar todos"),
            ("12", f"{C.RED}Reset total (borra MongoDB){C.NC}"),
            ("13", "Limpiar Docker"),
            (" 0", "Salir"),
        ]
        for key, desc in lineas:
            if desc is None:
                print(f"{C.CYAN}+{'='*56}+{C.NC}")
                print(f"{C.CYAN}|  {C.BOLD}{key:<54}{C.NC}{C.CYAN}|{C.NC}")
            else:
                print(f"{C.CYAN}|{C.NC}  {C.YELLOW}{key}{C.NC}. {desc:<52}{C.CYAN}|{C.NC}")
        print(f"{C.CYAN}+{'='*56}+{C.NC}")
        print()

    def menu(self):
        while True:
            self._mostrar_menu()
            opcion = input("Opcion: ").strip().lower()

            if opcion == '0':
                print("Adios."); break

            nombre = self.MAPA.get(opcion)
            if not nombre:
                warn("Opcion no valida."); time.sleep(1); continue

            getattr(self, nombre)()

            if opcion not in ('8', '9'):
                pause()


# ─────────────────────────────────────────────────────────────────────────────
# Entrada
# ─────────────────────────────────────────────────────────────────────────────
def main():
    coord = Coordinador()
    if not coord.check():
        sys.exit(1)

    if len(sys.argv) > 1:
        opcion = sys.argv[1].lower()
        nombre = coord.MAPA.get(opcion)
        if not nombre:
            err(f"Opcion invalida: {opcion}")
            print(f"Opciones validas: {', '.join(sorted(coord.MAPA))}")
            sys.exit(1)
        getattr(coord, nombre)()
        return

    coord.menu()


if __name__ == '__main__':
    main()
