import { ComponentType, Element } from 'react';
import { UserRole } from './user.types';

export interface IRoute {
  name: string;
  layout: string;
  icon: JSX.Element | string;
  items?: any;
  path: string;
  secondary?: boolean | undefined;
  allowedRoles?: UserRole[];
}
interface RoutesType {
  name: string;
  layout: string;
  icon: JSX.Element | string;
  path: string;
  secondary?: boolean | undefined;
  allowedRoles?: UserRole[];
  children?: RoutesType[];
}
