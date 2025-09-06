import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';


@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const token = localStorage.getItem('token');
    console.log("Token in RoleGuard:", token);
    if (!token) {
      this.router.navigate(['/adminLogin']);
      return false;
    }
    try {
      const decoded: any = jwtDecode(token);
      console.log("Decoded token in RoleGuard:", decoded);
      const userRole = decoded.role;
       // Make sure your backend includes 'role' in the token
       console.log("User role in RoleGuard:", userRole);
      const allowedRoles = route.data['roles'] as Array<string>;
      if (allowedRoles.includes(userRole)) {
        return true;
      }
      // Redirect to a not-authorized page or their dashboard
      if (userRole === 'LT') {
        this.router.navigate(['/LTPoints']);
      } else {
        this.router.navigate(['/dashboard']);
      }
      return false;
    } catch (e) {
      this.router.navigate(['/adminLogin']);
      return false;
    }
  }
}