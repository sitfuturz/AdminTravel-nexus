import { Chapter } from './../../../services/auth.service';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { MemberApplicationService, MemberApplication, MemberApplicationResponse } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { environment } from 'src/env/env.local';

declare var bootstrap: any;

@Component({
  selector: 'app-member-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [MemberApplicationService],
  templateUrl: './application.component.html',
  styleUrls: ['./application.component.css'],
})
export class MemberApplicationsComponent implements OnInit {
  applications: MemberApplicationResponse = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 0,  
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null
  };
  
  loading: boolean = false;
  editLoading: boolean = false;
  convertLoading: { [key: string]: boolean } = {};
  searchQuery: string = '';
  selectedMember: MemberApplication | null = null;
  selectedImage: string | null = null;
  selectedImageTitle: string = '';
  imageModal: any;
  editModal: any;
  editApplication: MemberApplication = {
    _id: '',
    chapter: '',
    invitedBy: '',
    applicant: {
      firstName: '',
      lastName: '',
      companyName: '',
      
      industry: '',
      professionalClassification: '',
      businessAddress: {
        addressLine1: '',
        city: '',
        state: 'Gujarat',
        postalCode: ''
      },
      email: '',
      mobileNumber: '',
      adhaarNumber: ''
    },
    references: {
      reference1: {
        firstName: '',
        lastName: '',
        phone: ''
      },
      reference2: {
        firstName: '',
        lastName: '',
        phone: ''
      }
    }
  };
  fileInputs: { aadhaarPhoto?: File; livePhoto?: File } = {};
  
  // Dropdown options
  chapters = [{ name: 'Achiever' }, { name: 'Believers' }];
  states = [{ name: 'Gujarat' }];
  cities = [{ name: 'Surat' }, { name: 'Bardoli' }];
  
  payload = {
    page: 1,
    limit: 10
  };

  private searchSubject = new Subject<string>();

  constructor(
    private memberApplicationService: MemberApplicationService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.fetchApplications();
    });
  }

  ngOnInit(): void {
    this.fetchApplications();
    this.initializeModals();
  }

  initializeModals(): void {
    setTimeout(() => {
      const imageModalElement = document.getElementById('imageModal');
      const editModalElement = document.getElementById('editModal');
      if (imageModalElement) {
        this.imageModal = new bootstrap.Modal(imageModalElement);
      }
      if (editModalElement) {
        this.editModal = new bootstrap.Modal(editModalElement);
      }
    }, 300);
  }
  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) {
      return 'assets/images/placeholder-image.png';
    }
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Remove trailing slash from environment.imageUrl, if present
    const baseUrl = environment.imageUrl.endsWith('/') 
      ? environment.imageUrl.slice(0, -1) 
      : environment.imageUrl;
    
    if (imagePath.startsWith('/')) {
      return `${baseUrl}${imagePath}`;
    } else {
      return `${baseUrl}/${imagePath}`;
    }
  }
  async fetchApplications(): Promise<void> {
    this.loading = true;
    
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        ...(this.searchQuery && { search: this.searchQuery })
      };
      
      const response = await this.memberApplicationService.getAllApplications(requestData);
      this.applications = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching applications:', error);
      swalHelper.showToast('Failed to fetch applications', 'error');
    } finally {
      this.loading = false;
    }
  }

  onSearch(): void {
    this.payload.page = 1;
    this.searchSubject.next(this.searchQuery);
  }
  
  onChange(): void {
    this.payload.page = 1;
    this.fetchApplications();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchApplications();
  }

  exportData(): void {
    const headers = [
      'First Name', 'Last Name', 'InvitedBy','Company Name','chapter', 'Industry','DateOfBirth','Anniversary Date','Spouse Name','Blood Group','Professional Classification',
      'Address Line 1', 'City', 'State', 'Postal Code', 'Email', 'Mobile Number',
      'GST Number', 'Aadhaar Number', 'Reference 1 Name', 'Reference 1 Phone',
      'Reference 2 Name', 'Reference 2 Phone'
    ];
    
    const data = this.applications.docs.map(app => [
      app.applicant.firstName,
      app.applicant.lastName,
      app.invitedBy,
      app.applicant.companyName,
      app.chapter,
      app.applicant.industry,
      app.applicant.dateOfBirth ? new Date(app.applicant.dateOfBirth).toLocaleDateString() : '',
      app.applicant.anniversaryDate ? new Date(app.applicant.anniversaryDate).toLocaleDateString() : '',
      app.applicant.spouseName || '',
      app.applicant.bloodGroup || '',
      app.applicant.professionalClassification,
      app.applicant.businessAddress.addressLine1,
      app.applicant.businessAddress.city,
      app.applicant.businessAddress.state,
      app.applicant.businessAddress.postalCode,
      app.applicant.email,
      app.applicant.mobileNumber,
      app.applicant.gstNumber || '',
      app.applicant.adhaarNumber,
      `${app.references.reference1.firstName} ${app.references.reference1.lastName}`,
      app.references.reference1.phone,
      `${app.references.reference2.firstName} ${app.references.reference2.lastName}`,
      app.references.reference2.phone
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'member_applications.csv');
    link.click();
    URL.revokeObjectURL(url);
  }
 
  viewImage(imageUrl: string | undefined, title: string): void {
    this.selectedImage = this.getImageUrl(imageUrl);
    this.selectedImageTitle = title;
    this.imageModal.show();
  }

  closeImageModal(): void {
    this.imageModal.hide();
    this.selectedImage = null;
    this.selectedImageTitle = '';
  }

  openEditModal(app: MemberApplication): void {
    // Deep copy to avoid modifying original data
    this.editApplication = JSON.parse(JSON.stringify(app));
    this.fileInputs = {};
    this.editModal.show();
  }

  closeEditModal(): void {
    this.editModal.hide();
    this.editApplication = {
      _id: '',
      chapter: '',
      invitedBy: '',
      applicant: {
        firstName: '',
        lastName: '',
        companyName: '',
        industry: '',
        professionalClassification: '',
        businessAddress: {
          addressLine1: '',
          city: '',
          state: 'Gujarat',
          postalCode: ''
        },
        email: '',
        mobileNumber: '',
        adhaarNumber: '',
      },
      references: {
        reference1: {
          firstName: '',
          lastName: '',
          phone: ''
        },
        reference2: {
          firstName: '',
          lastName: '',
          phone: ''
        }
      }
    };
    this.fileInputs = {};
  }

  onFileChange(event: Event, field: 'aadhaarPhoto' | 'livePhoto'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileInputs[field] = input.files[0];
    }
  }

  async submitEdit(): Promise<void> {
    if (!this.editApplication) return;

    this.editLoading = true;
    try { 
      const formData = new FormData();
      formData.append('applicationId', this.editApplication._id);
      formData.append('chapter', this.editApplication.chapter);
      formData.append('applicant[firstName]', this.editApplication.applicant.firstName);
      formData.append('applicant[lastName]', this.editApplication.applicant.lastName);
      formData.append('applicant[companyName]', this.editApplication.applicant.companyName || '');
      formData.append('applicant[industry]', this.editApplication.applicant.industry || '');
      formData.append('applicant[professionalClassification]', this.editApplication.applicant.professionalClassification || '');
      formData.append('applicant[businessAddress][addressLine1]', this.editApplication.applicant.businessAddress.addressLine1 || '');
      formData.append('applicant[businessAddress][city]', this.editApplication.applicant.businessAddress.city || '');

      formData.append('applicant[businessAddress][state]', this.editApplication.applicant.businessAddress.state || '');
      formData.append('applicant[businessAddress][postalCode]', this.editApplication.applicant.businessAddress.postalCode || '');
      formData.append('applicant[email]', this.editApplication.applicant.email);
      formData.append('applicant[mobileNumber]', this.editApplication.applicant.mobileNumber);
      formData.append('applicant[gstNumber]', this.editApplication.applicant.gstNumber || '');
      // Remove spaces from Aadhaar number before sending
      formData.append('applicant[adhaarNumber]', this.editApplication.applicant.adhaarNumber.replace(/\s/g, ''));

      if (this.fileInputs.aadhaarPhoto) {
        formData.append('aadhaarPhoto', this.fileInputs.aadhaarPhoto);
      }
      if (this.fileInputs.livePhoto) {
        formData.append('livePhoto', this.fileInputs.livePhoto);
      }

      const response = await this.memberApplicationService.editApplication(formData);
      swalHelper.showToast('Application updated successfully', 'success');
      this.closeEditModal();
      await this.fetchApplications();
    } catch (error: any) {
      console.error('Error updating application:', error);
      swalHelper.showToast(error.message || 'Failed to update application', 'error');
    } finally {
      this.editLoading = false;
      this.cdr.detectChanges();
    }
  }

  async convertToUser(applicationId: string): Promise<void> {
    this.convertLoading[applicationId] = true;
    this.cdr.detectChanges();

    try {
      const response = await this.memberApplicationService.convertToUser(applicationId);
      
      swalHelper.showToast(response.message || 'Member successfully converted to user', 'success');
      await this.fetchApplications(); // Refresh the list
    } catch (error: any) {
      console.error('Error converting member to user:', error);
      swalHelper.showToast(error.message || 'Failed to convert member to user', 'error');
    } finally {
      this.convertLoading[applicationId] = false;
      this.cdr.detectChanges();
    }
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/images/placeholder-image.png';
    }
  }

  onModalImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/images/placeholder-image.png';
    }
  }
}