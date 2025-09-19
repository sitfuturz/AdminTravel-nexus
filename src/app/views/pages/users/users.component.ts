import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, City, CityService, Country, CountryService, State, StateService, User } from '../../../services/auth.service';
import { ReferralService1 } from '../../../services/auth.service';
import { ExportService } from '../../../services/export.service';
import { ChapterService } from '../../../services/auth.service';
import { RegionService } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { environment } from 'src/env/env.local';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import * as jspdf from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

declare var $: any;
declare var bootstrap: any;

// Interface for Region Object
interface RegionObject {
  _id: string;
  name: string;
  description: string;
  countries: string[];
}

// Interface for ExtendedUser
interface ExtendedUser {
  _id: string;
  name: string;
  email: string;
  mobile_number: string;
  chapter_name: string;
  meeting_role: string;
  induction_date: string;
  profilePic: string;
  date_of_birth: string;
  city: string;
  state: string;
  country: string;
  sponseredBy: string;
  status: boolean;
  createdAt: string;
  keywords: string;
 
  business_name: string;
  business_type: string; // Added business_type
  isMember: boolean;
  regions: RegionObject[];
  dmc_specializations: string[];
  services_offered: string[];
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [ExportService, StateService, CountryService, CityService, RegionService],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit, AfterViewInit {
  users: any = { docs: [], totalDocs: 0, limit: 10, page: 1, totalPages: 0 };
  chapters: any[] = [];
  regions: RegionObject[] = [];
  selectedChapter: string | null = null;
  loading: boolean = false;
  exporting: boolean = false;
  searchQuery: string = '';
  selectedUser: ExtendedUser | null = null;
  userDetailsModal: any;
  notificationModal: any;
  imageurl = environment.imageUrl;
  pathurl = environment.baseURL;
  activeTab: string = 'profile';
  referralTab: string = 'given';
  referralsGiven: any[] = [];
  referralsReceived: any[] = [];
  referralsGivenTotal: number = 0;
  referralsReceivedTotal: number = 0;
  referralLoading: boolean = false;
  regionsLoading: boolean = false;
  pdfLoading: boolean = false;
  Math = Math;

  // Predefined arrays for specializations, services, and business types
  specializations: string[] = [
    'MICE', 'Adventure', 'Luxury', 'Cultural', 'Corporate',
    'Leisure', 'Educational', 'Medical', 'Religious', 'Eco-Tourism'
  ];
  servicesOffered: string[] = [
    'Hotel Booking', 'Transportation', 'Guided Tours', 'Event Management',
    'Airport Transfers', 'Visa Assistance', 'Travel Insurance', 'Custom Packages'
  ];
  businessTypes: string[] = ['B2B', 'B2C']; // Added business types

  notificationForm = {
    userId: '',
    title: '',
    description: '',
    message: ''
  };
  notificationError = {
    title: '',
    description: ''
  };
  notificationLoading: boolean = false;

  paginationConfig = {
    id: 'users-pagination'
  };
  editUserModal: any;
  editForm = {
    name: '',
    mobile_number: '',
    email: '',
    city: '',
    state: '',
    country: '',
    business_name: '',
    business_type: '', // Added business_type
    regions: [] as string[],
    dmc_specializations: [] as string[],
    services_offered: [] as string[]
  };
  editError = {
    name: '',
    mobile_number: '',
    email: '',
    city: '',
    state: '',
    country: '',
    business_name: '',
    business_type: '', // Added business_type
    regions: '',
    dmc_specializations: '',
    services_offered: ''
  };
  editLoading: boolean = false;

  referralPaginationConfig = {
    givenId: 'referrals-given-pagination',
    receivedId: 'referrals-received-pagination'
  };

  payload = {
    search: '',
    page: 1,
    limit: 10,
    chapter: ''
  };

  referralPayload = {
    page: 1,
    givenPage: 1,
    receivedPage: 1,
    limit: 5
  };
  countries: Country[] = [];
  states: State[] = [];
  cities: City[] = [];

  countriesLoading: boolean = false;
  statesLoading: boolean = false;
  citiesLoading: boolean = false;
  usersLoading: boolean = false;

  countriesLoaded: boolean = false;
  statesLoaded: boolean = false;
  citiesLoaded: boolean = false;
  usersLoaded: boolean = false;

  private searchSubject = new Subject<string>();

  constructor(
    private authService: AuthService,
    private referralService: ReferralService1,
    private chapterService: ChapterService,
    private countryService: CountryService,
    private stateService: StateService,
    private cityService: CityService,
    private regionService: RegionService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchUsers();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
    this.fetchUsers();
    this.fetchCountries();
    this.fetchStates();
    this.fetchCities();
    this.fetchRegions();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const userModalElement = document.getElementById('userDetailsModal');
      if (userModalElement) {
        this.userDetailsModal = new bootstrap.Modal(userModalElement);
      } else {
        console.warn('User modal element not found in the DOM');
      }
      const editModalElement = document.getElementById('editUserModal');
      if (editModalElement) {
        this.editUserModal = new bootstrap.Modal(editModalElement);
      } else {
        console.warn('Edit user modal element not found in the DOM');
      }
      const notificationModalElement = document.getElementById('notificationModal');
      if (notificationModalElement) {
        this.notificationModal = new bootstrap.Modal(notificationModalElement);
      } else {
        console.warn('Notification modal element not found in the DOM');
      }

      // Initialize tooltips
      this.initializeTooltips();
    }, 300);
  }

  initializeTooltips(): void {
    setTimeout(() => {
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      tooltipTriggerList.forEach(tooltipTriggerEl => {
        new bootstrap.Tooltip(tooltipTriggerEl);
      });
    }, 500);
  }

  getRegionsTooltip(regions: RegionObject[]): string {
    if (!regions || regions.length <= 1) return '';

    const additionalRegions = regions.slice(1);
    return additionalRegions.map(region =>
      `${region.name} - Countries: ${region.countries?.join(', ') || 'N/A'}`
    ).join('\n');
  }

  getSpecializationsDisplay(specializations: string[]): string {
    if (!specializations || specializations.length === 0) return 'N/A';
    return specializations.join(', ');
  }

  getServicesDisplay(services: string[]): string {
    if (!services || services.length === 0) return 'N/A';
    return services.join(', ');
  }

  getRegionsDisplay(regions: RegionObject[]): string {
    if (!regions || regions.length === 0) return 'N/A';
    return regions.map(region => `${region.name} (${region.countries?.join(', ') || 'N/A'})`).join(', ');
  }

  async fetchRegions(): Promise<void> {
    this.regionsLoading = true;
    try {
      const response = await this.regionService.getRegions({
        page: 1,
        limit: 1000,
        search: ''
      });
      this.regions = response.docs;
    } catch (error) {
      console.error('Error fetching regions:', error);
      swalHelper.showToast('Failed to fetch regions', 'error');
    } finally {
      this.regionsLoading = false;
      this.cdr.detectChanges();
    }
  }

  async fetchChapters(): Promise<void> {
    try {
      const chapters = await this.chapterService.getAllChaptersForDropdown();
      this.chapters = chapters;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching chapters:', error);
      swalHelper.showToast('Failed to fetch chapters', 'error');
    }
  }

  async fetchUsers(): Promise<void> {
    this.loading = true;
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search,
        chapter: this.payload.chapter
      };
      const response = await this.authService.getUsers(requestData);
      if (response) {
        this.users = response;
        this.cdr.detectChanges();

        // Reinitialize tooltips after data loads
        this.initializeTooltips();
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      swalHelper.showToast('Failed to fetch users', 'error');
      this.users = { docs: [], totalDocs: 0, limit: this.payload.limit, page: this.payload.page, totalPages: 0 };
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }

  onChapterChange(): void {
    this.payload.page = 1;
    this.payload.chapter = this.selectedChapter || '';
    this.payload.search = '';
    this.searchQuery = '';
    this.fetchUsers();
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = '/assets/images/placeholder-image.png';
  }

  onChange(): void {
    this.payload.page = 1;
    this.fetchUsers();
  }

  onPageChange(page: number): void {
    if (page !== this.payload.page) {
      this.payload.page = page;
      this.fetchUsers();
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'referrals' && this.selectedUser) {
      this.referralTab = 'given';
      this.referralsGiven = [];
      this.referralsReceived = [];
      this.referralPayload.givenPage = 1;
      this.referralPayload.receivedPage = 1;
      this.fetchReferrals();
    }
  }

  setReferralTab(tab: string): void {
    this.referralTab = tab;
    this.referralPayload.givenPage = 1;
    this.referralPayload.receivedPage = 1;
    this.fetchReferrals();
  }

  async fetchReferrals(): Promise<void> {
    if (!this.selectedUser?._id) {
      console.warn('No user ID available for fetching referrals');
      return;
    }

    this.referralLoading = true;
    try {
      let response;
      if (this.referralTab === 'given') {
        response = await this.referralService.getReferralsGiven(this.selectedUser._id, {
          page: this.referralPayload.givenPage,
          limit: this.referralPayload.limit
        });
        this.referralsGiven = (response?.data && Array.isArray(response.data.docs)) ? response.data.docs : [];
        this.referralsGivenTotal = response?.data?.totalDocs || 0;
      } else {
        response = await this.referralService.getReferralsReceived(this.selectedUser._id, {
          page: this.referralPayload.receivedPage,
          limit: this.referralPayload.limit
        });
        this.referralsReceived = (response?.data && Array.isArray(response.data.docs)) ? response.data.docs : [];
        this.referralsReceivedTotal = response?.data?.totalDocs || 0;
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching referrals:', error);
      swalHelper.showToast('Failed to fetch referrals', 'error');
      this.referralsGiven = [];
      this.referralsReceived = [];
      this.referralsGivenTotal = 0;
      this.referralsReceivedTotal = 0;
    } finally {
      this.referralLoading = false;
      this.cdr.detectChanges();
    }
  }

  onGivenReferralPageChange(page: number): void {
    if (page !== this.referralPayload.givenPage) {
      this.referralPayload.givenPage = page;
      this.fetchReferrals();
    }
  }

  onReceivedReferralPageChange(page: number): void {
    if (page !== this.referralPayload.receivedPage) {
      this.referralPayload.receivedPage = page;
      this.fetchReferrals();
    }
  }

  viewUserDetails(user: ExtendedUser): void {
    this.selectedUser = user;
    this.activeTab = 'profile';
    this.referralTab = 'given';
    this.referralsGiven = [];
    this.referralsReceived = [];
    this.referralsGivenTotal = 0;
    this.referralsReceivedTotal = 0;

    if (this.userDetailsModal) {
      this.userDetailsModal.show();
    } else {
      try {
        const modalElement = document.getElementById('userDetailsModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.userDetailsModal = modalInstance;
          modalInstance.show();
        } else {
          $('#userDetailsModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        $('#userDetailsModal').modal('show');
      }
    }
  }

  openNotificationModal(user: any): void {
    this.selectedUser = user;
    this.notificationForm = {
      userId: user._id,
      title: '',
      description: '',
      message: ''
    };
    this.notificationError = {
      title: '',
      description: ''
    };
    if (this.notificationModal) {
      this.notificationModal.show();
    } else {
      try {
        const modalElement = document.getElementById('notificationModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.notificationModal = modalInstance;
          modalInstance.show();
        } else {
          $('#notificationModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing notification modal:', error);
        $('#notificationModal').modal('show');
      }
    }
  }

  closeNotificationModal(): void {
    if (this.notificationModal) {
      this.notificationModal.hide();
    } else {
      $('#notificationModal').modal('hide');
    }
  }

  validateNotificationForm(): boolean {
    let isValid = true;
    this.notificationError = { title: '', description: '' };

    if (!this.notificationForm.title.trim()) {
      this.notificationError.title = 'Title is required';
      isValid = false;
    }
    if (!this.notificationForm.description.trim()) {
      this.notificationError.description = 'Description is required';
      isValid = false;
    }
    return isValid;
  }

  async sendNotification(): Promise<void> {
    if (!this.validateNotificationForm()) {
      return;
    }

    this.notificationLoading = true;
    try {
      const response = await this.authService.sendNotification(this.notificationForm);
      if (response.success) {
        swalHelper.showToast('Notification sent successfully', 'success');
        this.closeNotificationModal();
      } else {
        swalHelper.showToast(response.message || 'Failed to send notification', 'error');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      swalHelper.showToast('Failed to send notification', 'error');
    } finally {
      this.notificationLoading = false;
      this.cdr.detectChanges();
    }
  }

  editUser(user: ExtendedUser): void {
    this.selectedUser = user;
    this.editForm = {
      name: user.name || '',
      mobile_number: user.mobile_number || '',
      email: user.email || '',
      city: user.city || '',
      state: user.state || '',
      country: user.country || '',
      business_name: user.business_name || '',
      business_type: user.business_type || '', // Added business_type
      regions: user.regions?.map(region => region._id) || [],
      dmc_specializations: user.dmc_specializations || [],
      services_offered: user.services_offered || []
    };
    this.editError = {
      name: '',
      mobile_number: '',
      email: '',
      city: '',
      state: '',
      country: '',
      business_name: '',
      business_type: '',
      regions: '',
      dmc_specializations: '',
      services_offered: ''
    };

    if (this.editUserModal) {
      this.editUserModal.show();
    } else {
      try {
        const modalElement = document.getElementById('editUserModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.editUserModal = modalInstance;
          modalInstance.show();
        } else {
          $('#editUserModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing edit modal:', error);
        $('#editUserModal').modal('show');
      }
    }
  }

  closeEditModal(): void {
    if (this.editUserModal) {
      this.editUserModal.hide();
    } else {
      $('#editUserModal').modal('hide');
    }
  }

  validateEditForm(): boolean {
    let isValid = true;
    this.editError = {
      name: '',
      mobile_number: '',
      email: '',
      city: '',
      state: '',
      country: '',
      business_name: '',
      business_type: '',
      regions: '',
      dmc_specializations: '',
      services_offered: ''
    };

    if (!this.editForm.name.trim()) {
      this.editError.name = 'Name is required';
      isValid = false;
    }
    if (!this.editForm.mobile_number.trim()) {
      this.editError.mobile_number = 'Mobile number is required';
      isValid = false;
    } else if (!/^\d{10}$/.test(this.editForm.mobile_number)) {
      this.editError.mobile_number = 'Mobile number must be 10 digits';
      isValid = false;
    }
    if (!this.editForm.email.trim()) {
      this.editError.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.editForm.email)) {
      this.editError.email = 'Invalid email format';
      isValid = false;
    }
    if (!this.editForm.city.trim()) {
      this.editError.city = 'City is required';
      isValid = false;
    }
    if (!this.editForm.state.trim()) {
      this.editError.state = 'State is required';
      isValid = false;
    }
    if (!this.editForm.country.trim()) {
      this.editError.country = 'Country is required';
      isValid = false;
    }
    if (!this.editForm.business_name.trim()) {
      this.editError.business_name = 'Business name is required';
      isValid = false;
    }
    if (!this.editForm.business_type) {
      this.editError.business_type = 'Business type is required';
      isValid = false;
    } else if (!['B2B', 'B2C'].includes(this.editForm.business_type)) {
      this.editError.business_type = 'Business type must be either B2B or B2C';
      isValid = false;
    }

    return isValid;
  }

  async fetchCountries(): Promise<void> {
    this.countriesLoading = true;
    this.countriesLoaded = false;
    try {
      const response = await this.countryService.getAllCountries({
        page: 1,
        limit: 1000,
        search: ''
      });
      this.countries = response.docs;
      this.countriesLoaded = true;
    } catch (error) {
      console.error('Error fetching countries:', error);
      swalHelper.showToast('Failed to fetch countries', 'error');
    } finally {
      this.countriesLoading = false;
      this.cdr.detectChanges();
    }
  }

  async fetchStates(): Promise<void> {
    this.statesLoading = true;
    this.statesLoaded = false;
    try {
      const response = await this.stateService.getAllStates({
        page: 1,
        limit: 1000,
        search: ''
      });
      this.states = response.docs;
      this.statesLoaded = true;
    } catch (error) {
      console.error('Error fetching states:', error);
      swalHelper.showToast('Failed to fetch states', 'error');
    } finally {
      this.statesLoading = false;
      this.cdr.detectChanges();
    }
  }

  async fetchCities(): Promise<void> {
    this.citiesLoading = true;
    this.citiesLoaded = false;
    try {
      const response = await this.cityService.getAllCities({
        page: 1,
        limit: 1000,
        search: ''
      });
      this.cities = response.docs;
      this.citiesLoaded = true;
    } catch (error) {
      console.error('Error fetching cities:', error);
      swalHelper.showToast('Failed to fetch cities', 'error');
    } finally {
      this.citiesLoading = false;
      this.cdr.detectChanges();
    }
  }

  async updateUser(): Promise<void> {
    if (!this.validateEditForm()) {
      return;
    }

    this.editLoading = true;
    try {
      const response = await this.authService.updateNewUser(this.selectedUser!._id, {
        ...this.editForm,
        business: [{
          business_name: this.editForm.business_name,
          business_type: this.editForm.business_type,
          primary_business: true
        }]
      });
      if (response.success) {
        swalHelper.showToast('User updated successfully', 'success');
        this.closeEditModal();
        this.fetchUsers();
      } else {
        swalHelper.showToast(response.message || 'Failed to update user', 'error');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      swalHelper.showToast('Failed to update user', 'error');
    } finally {
      this.editLoading = false;
      this.cdr.detectChanges();
    }
  }

  closeModal(): void {
    if (this.userDetailsModal) {
      this.userDetailsModal.hide();
    } else {
      $('#userDetailsModal').modal('hide');
    }
  }

  async toggleUserStatus(user: any): Promise<void> {
    try {
      this.loading = true;
      const response = await this.authService.toggleUserStatus({ id: user._id });
      if (response && response.success) {
        user.isActive = response.data;
        swalHelper.showToast(`User status changed to ${response.data ? 'Active' : 'Inactive'}`, 'success');
      } else {
        const errorMessage = response?.message || 'Failed to update user status';
        console.error('Toggle user status failed:', errorMessage);
        swalHelper.showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      swalHelper.showToast('Failed to update user status', 'error');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete User',
        'Are you sure you want to delete this user? This action cannot be undone.',
        'warning'
      );

      if (result.isConfirmed) {
        this.loading = true;
        const response = await this.authService.deleteUser(userId);
        if (response.success) {
          swalHelper.showToast('User deleted successfully', 'success');
          this.fetchUsers();
        } else {
          swalHelper.showToast(response.message || 'Failed to delete user', 'error');
        }
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      swalHelper.showToast('Failed to delete user', 'error');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

}