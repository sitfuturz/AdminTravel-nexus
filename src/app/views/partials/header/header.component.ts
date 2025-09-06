import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStorage } from 'src/app/core/utilities/app-storage';
import { swalHelper } from 'src/app/core/constants/swal-helper';
import { AuthService } from 'src/app/services/auth.service';
import { common } from 'src/app/core/constants/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  constructor(
    private storage: AppStorage,
     private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
   
  }

  logout = async () => {
    let result = await swalHelper.confirmation(
      'Logout',
      'Do you really want to logout',
      'question'
    );
    if (result.isConfirmed) {
      this.storage.clearAll();
 this.router.navigate(['/adminLogin']);
    }
  };
}
