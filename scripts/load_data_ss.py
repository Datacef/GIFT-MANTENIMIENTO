import pandas as pd
import requests
import sys

EXCEL_FILE = r"scripts\data\establecimiento.xlsx"

PARSE_URL = "http://localhost:5771/api/parse/classes/Establecimiento"
APP_ID = "282067025780"
MASTER_KEY = "hfYyn5FxkYDlOgJ2eJw2HZDW3Zm5TwS0m83ICqmIl25UrHhU"

headers = {
    "X-Parse-Application-Id": APP_ID,
    "X-Parse-Master-Key": MASTER_KEY,
    "Content-Type": "application/json"
}

# Columnas del Excel a cargar
COLUMNS_MAP = {
    "EstablecimientoCodigo": "codigo",
    "EstablecimientoGlosa": "nombre",
    "RegionCodigo": "regionCodigo",
    "RegionGlosa": "regionNombre",
    "SeremiSaludCodigo_ServicioDeSaludCodigo": "servicioSaludCodigo",
    "SeremiSaludGlosa_ServicioDeSaludGlosa": "servicioSaludNombre",
    "TipoEstablecimientoGlosa": "tipoEstablecimiento",
    "DependenciaAdministrativa": "dependenciaAdministrativa",
    "ComunaCodigo": "comunaCodigo",
    "ComunaGlosa": "comunaNombre",
    "NivelComplejidadEstabGlosa": "nivelComplejidad",
    "TipoAtencionEstabGlosa": "tipoAtencion",
    "EstadoFuncionamiento": "estadoFuncionamiento",
    "Latitud": "latitud",
    "Longitud": "longitud",
    "TipoViaGlosa": "tipoVia",
    "NombreVia": "nombreVia",
    "Numero": "numero",
}


def resolve_base_url():
    """Determina la URL base correcta (con o sin /api prefix)."""
    try:
        res = requests.get(PARSE_URL, headers=headers, timeout=5)
        if res.status_code != 404:
            return PARSE_URL
    except Exception:
        pass

    fallback = PARSE_URL.replace("/api/parse/", "/parse/")
    try:
        res = requests.get(fallback, headers=headers, timeout=5)
        if res.status_code != 404:
            return fallback
    except Exception:
        pass

    return PARSE_URL


def delete_all_records(base_url):
    """Elimina todos los registros existentes de la coleccion Establecimiento."""
    print("[*] Eliminando registros existentes...")
    deleted = 0

    while True:
        res = requests.get(f"{base_url}?limit=100", headers=headers, timeout=10)
        if res.status_code != 200:
            print(f" -> [ERROR] No se pudo consultar la coleccion. HTTP {res.status_code}")
            break

        results = res.json().get("results", [])
        if len(results) == 0:
            break

        for obj in results:
            object_id = obj["objectId"]
            del_res = requests.delete(f"{base_url}/{object_id}", headers=headers, timeout=10)
            if del_res.status_code == 200:
                deleted += 1
            else:
                print(f" -> [ERROR] No se pudo eliminar {object_id}. HTTP {del_res.status_code}")

    print(f" -> {deleted} registros eliminados.")
    return deleted


def load_data():
    try:
        print(f"[*] Leyendo archivo Excel: {EXCEL_FILE}")
        df = pd.read_excel(EXCEL_FILE)

        print(f" -> {len(df)} filas encontradas en el Excel.")
        print(f" -> Columnas: {list(df.columns)}\n")

        # Resolver URL base
        base_url = resolve_base_url()
        print(f"[*] URL base: {base_url}\n")

        # Borrar todos los registros existentes
        delete_all_records(base_url)

        # Insertar en lotes de 50 usando batch
        print("\n[*] Insertando registros...")
        count_inserted = 0
        count_errors = 0
        batch_size = 50
        rows = []

        for _, row in df.iterrows():
            record = {}
            for excel_col, parse_col in COLUMNS_MAP.items():
                val = row.get(excel_col)
                if pd.isna(val):
                    record[parse_col] = None
                elif isinstance(val, float) and val == int(val):
                    record[parse_col] = int(val)
                else:
                    record[parse_col] = str(val).strip() if isinstance(val, str) else val
            rows.append(record)

        total = len(rows)
        print(f" -> {total} registros a insertar.\n")

        for i in range(0, total, batch_size):
            batch = rows[i:i + batch_size]
            batch_requests = []
            for item in batch:
                batch_requests.append({
                    "method": "POST",
                    "path": "/parse/classes/Establecimiento",
                    "body": item
                })

            try:
                batch_url = base_url.replace("/classes/Establecimiento", "/batch")
                res = requests.post(
                    batch_url,
                    headers=headers,
                    json={"requests": batch_requests},
                    timeout=30
                )
                if res.status_code == 200:
                    results = res.json()
                    for r in results:
                        if "success" in r:
                            count_inserted += 1
                        else:
                            count_errors += 1
                    pct = round((min(i + batch_size, total) / total) * 100)
                    print(f" -> Lote {i // batch_size + 1}: {len(batch)} registros ({pct}%)")
                else:
                    print(f" -> [ERROR] Lote fallo. HTTP {res.status_code}: {res.text[:200]}")
                    count_errors += len(batch)
            except Exception as conn_err:
                print(f" -> [ERROR DE CONEXION] en lote {i // batch_size + 1}: {conn_err}")
                count_errors += len(batch)

        print(f"\n[*] PROCESO FINALIZADO.")
        print(f" -> Registros insertados: {count_inserted}")
        print(f" -> Errores encontrados: {count_errors}")
        print(f" -> Total procesados: {total}\n")

    except FileNotFoundError:
        print(f"[!] ARCHIVO NO ENCONTRADO: Verifica que '{EXCEL_FILE}' exista.")
    except Exception as e:
        print(f"[!] ERROR INESPERADO: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    load_data()
