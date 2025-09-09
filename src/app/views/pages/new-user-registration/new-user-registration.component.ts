import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxPaginationModule } from 'ngx-pagination';
import { RegisterUserAuthService, User } from '../../../services/auth.service';
import { CountryService, Country } from '../../../services/auth.service';
import { StateService, State } from '../../../services/auth.service';
import { CityService, City } from '../../../services/auth.service';
import { AuthService } from '../../../services/auth.service';
import { DashboardService } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';

declare var $: any;
declare var bootstrap: any;

// Interface for Registration data
interface Registration {
  _id: string;
  name: string;
  email: string;
  mobile_number: string;
  country: string;
  state: string;
  city: string;
  business_name: string;
  isMember: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Interface for API Response Data
interface RegistrationData {
  docs: Registration[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  pagingCounter: number;
  prevPage: number | null;
  nextPage: number | null;
}

// Interface for API Response
interface RegistrationResponse {
  success: boolean;
  message: string;
  data: RegistrationData;
  status: number;
}

@Component({
  selector: 'app-new-user-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, NgxPaginationModule],
  providers: [RegisterUserAuthService, CountryService, StateService, CityService, AuthService, DashboardService],
  templateUrl: './new-user-registration.component.html',
  styleUrl: './new-user-registration.component.css'
})
export class NewUserRegistrationComponent implements OnInit, AfterViewInit {
  registerForm: any = {
    name: '',
    email: '',
    mobile_number: '',
    city: '',
    state: '',
    country: '',
    business_name: ''
  };

  countries: Country[] = [];
  states: State[] = [];
  cities: City[] = [];
  
  // Registration list data - matching your backend response structure
  registrations: RegistrationData = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
    pagingCounter: 1,
    prevPage: null,
    nextPage: null
  };

  loading: boolean = false;
  countriesLoading: boolean = false;
  statesLoading: boolean = false;
  citiesLoading: boolean = false;
  registrationsLoading: boolean = false;
  acceptingUser: string = ''; // Track which user is being accepted
  
  countriesLoaded: boolean = false;
  statesLoaded: boolean = false;
  citiesLoaded: boolean = false;

  // Search and pagination
  searchQuery: string = '';
  payload = {
    search: '',
    page: 1,
    limit: 10
  };

  paginationConfig = {
    id: 'registrations-pagination'
  };

  // Track which fields have been touched/interacted with
  touchedFields: any = {
    name: false,
    email: false,
    mobile_number: false,
    country: false,
    state: false,
    city: false,
    business_name: false
  };

  // Validation error messages
  validationErrors: any = {
    name: '',
    email: '',
    mobile_number: '',
    country: '',
    state: '',
    city: '',
    business_name: ''
  };

  Math = Math;
  private searchSubject = new Subject<string>();
  registerModal: any;

  constructor(
    private registerService: RegisterUserAuthService,
    private countryService: CountryService,
    private stateService: StateService,
    private cityService: CityService,
    private authService: AuthService,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchRegistrations();
    });
  }

  ngOnInit(): void {
    this.fetchCountries();
    this.fetchStates();
    this.fetchCities();
    this.fetchRegistrations();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('registerModal');
      if (modalElement) {
        this.registerModal = new bootstrap.Modal(modalElement);
      }
    }, 300);
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

  async fetchRegistrations(): Promise<void> {
    this.registrationsLoading = true;
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search
      };
      const response: RegistrationResponse = await this.registerService.getAllMembers(requestData);
      
      if (response && response.success && response.data) {
        this.registrations = response.data;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      swalHelper.showToast('Failed to fetch registrations', 'error');
      this.registrations = {
        docs: [],
        totalDocs: 0,
        limit: this.payload.limit,
        page: this.payload.page,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        pagingCounter: 1,
        prevPage: null,
        nextPage: null
      };
    } finally {
      this.registrationsLoading = false;
      this.cdr.detectChanges();
    }
  }

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }

  onChange(): void {
    this.payload.page = 1;
    this.fetchRegistrations();
  }

  onPageChange(page: number): void {
    if (page !== this.payload.page) {
      this.payload.page = page;
      this.fetchRegistrations();
    }
  }

  async acceptUser(registration: Registration): Promise<void> {
    try {
      this.acceptingUser = registration._id;
      
      const result = await swalHelper.confirmation(
        'Accept User',
        `Are you sure you want to accept ${registration.name} as a member?`,
        'question'
      );

      if (result.isConfirmed) {
        const response = await this.registerService.addToMember({ id: registration._id });
        
        if (response && response.success) {
          swalHelper.showToast('User accepted successfully', 'success');
          this.fetchRegistrations(); // Refresh the list
        } else {
          swalHelper.showToast(response.message || 'Failed to accept user', 'error');
        }
      }
    } catch (error) {
      console.error('Error accepting user:', error);
      swalHelper.showToast('Failed to accept user', 'error');
    } finally {
      this.acceptingUser = '';
      this.cdr.detectChanges();
    }
  }


  onMobileInput(event: any): void {
    const input = event.target;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    
    this.registerForm.mobile_number = value;
    input.value = value;
    
    // Mark as touched and validate
    this.touchedFields.mobile_number = true;
    if (value.length === 10) {
      this.validationErrors.mobile_number = '';
    } else if (value.length > 0) {
      this.validateMobileNumber();
    }
  }

  validateName(): boolean {
    if (!this.touchedFields.name) {
      return true; // Don't validate untouched fields
    }

    const name = this.registerForm.name.trim();
    if (!name) {
      this.validationErrors.name = 'Full name is required';
      return false;
    }
    if (name.length < 2) {
      this.validationErrors.name = 'Full name must be at least 2 characters';
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      this.validationErrors.name = 'Full name can only contain letters and spaces';
      return false;
    }
    this.validationErrors.name = '';
    return true;
  }

  validateEmail(): boolean {
    if (!this.touchedFields.email) {
      return true;
    }

    const email = this.registerForm.email.trim();
    if (!email) {
      this.validationErrors.email = 'Email is required';
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.validationErrors.email = 'Please enter a valid email address';
      return false;
    }
    this.validationErrors.email = '';
    return true;
  }

  validateMobileNumber(): boolean {
    if (!this.touchedFields.mobile_number) {
      return true;
    }

    const mobile = this.registerForm.mobile_number;
    if (!mobile) {
      this.validationErrors.mobile_number = 'Mobile number is required';
      return false;
    }
    if (!/^\d{10}$/.test(mobile)) {
      this.validationErrors.mobile_number = 'Mobile number must be exactly 10 digits';
      return false;
    }
    this.validationErrors.mobile_number = '';
    return true;
  }

  validateCountry(): boolean {
    if (!this.touchedFields.country) {
      return true;
    }

    if (!this.registerForm.country) {
      this.validationErrors.country = 'Country is required';
      return false;
    }
    this.validationErrors.country = '';
    return true;
  }

  validateState(): boolean {
    if (!this.touchedFields.state) {
      return true;
    }

    if (!this.registerForm.state) {
      this.validationErrors.state = 'State is required';
      return false;
    }
    this.validationErrors.state = '';
    return true;
  }

  validateCity(): boolean {
    if (!this.touchedFields.city) {
      return true;
    }

    if (!this.registerForm.city) {
      this.validationErrors.city = 'City is required';
      return false;
    }
    this.validationErrors.city = '';
    return true;
  }

  validateBusinessName(): boolean {
    if (!this.touchedFields.business_name) {
      return true;
    }

    const businessName = this.registerForm.business_name.trim();
    if (!businessName) {
      this.validationErrors.business_name = 'Business name is required';
      return false;
    }
    if (businessName.length < 2) {
      this.validationErrors.business_name = 'Business name must be at least 2 characters';
      return false;
    }
    this.validationErrors.business_name = '';
    return true;
  }

  onFieldBlur(fieldName: string): void {
    // Mark field as touched
    this.touchedFields[fieldName] = true;
    
    // Then validate
    switch (fieldName) {
      case 'name':
        this.validateName();
        break;
      case 'email':
        this.validateEmail();
        break;
      case 'mobile_number':
        this.validateMobileNumber();
        break;
      case 'country':
        this.validateCountry();
        break;
      case 'state':
        this.validateState();
        break;
      case 'city':
        this.validateCity();
        break;
      case 'business_name':
        this.validateBusinessName();
        break;
    }
  }

  async registerUser(): Promise<void> {
    try {
      // Mark all required fields as touched before final validation
      this.markAllRequiredFieldsAsTouched();
      
      if (!this.validateFormForSubmission()) {
        swalHelper.showToast('Please fix all validation errors', 'warning');
        return;
      }

      this.loading = true;
      
      // Create request body object instead of FormData
      const requestBody: any = {};
      
      Object.keys(this.registerForm).forEach(key => {
        if (this.registerForm[key] !== null && this.registerForm[key] !== '') {
          requestBody[key] = this.registerForm[key];
        }
      });

      const response = await this.registerService.newRegisterUser(requestBody);
      console.log('Register response:', response);
      
      if (response && response.success) {
        swalHelper.showToast('User registered successfully', 'success');
        this.closeModal();
        this.resetForm();
        this.fetchRegistrations(); // Refresh the registrations list
      } else {
        swalHelper.showToast(response.message || 'Failed to register user', 'error');
      }
    } catch (error) {
      console.error('Error registering user:', error);
      swalHelper.showToast('Failed to register user', 'error');
    } finally {
      this.loading = false;
    }
  }


  markAllRequiredFieldsAsTouched(): void {
    this.touchedFields.name = true;
    this.touchedFields.email = true;
    this.touchedFields.mobile_number = true;
    this.touchedFields.country = true;
    this.touchedFields.state = true;
    this.touchedFields.city = true;
    this.touchedFields.business_name = true;
  }

  validateFormForSubmission(): boolean {
    const name = this.registerForm.name.trim();
    const email = this.registerForm.email.trim();
    const mobile = this.registerForm.mobile_number;
    const businessName = this.registerForm.business_name.trim();
    
    let isValid = true;

    // Validate name
    if (!name) {
      this.validationErrors.name = 'Full name is required';
      isValid = false;
    } else if (name.length < 2) {
      this.validationErrors.name = 'Full name must be at least 2 characters';
      isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(name)) {
      this.validationErrors.name = 'Full name can only contain letters and spaces';
      isValid = false;
    } else {
      this.validationErrors.name = '';
    }

    // Validate email
    if (!email) {
      this.validationErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.validationErrors.email = 'Please enter a valid email address';
      isValid = false;
    } else {
      this.validationErrors.email = '';
    }

    // Validate mobile
    if (!mobile) {
      this.validationErrors.mobile_number = 'Mobile number is required';
      isValid = false;
    } else if (!/^\d{10}$/.test(mobile)) {
      this.validationErrors.mobile_number = 'Mobile number must be exactly 10 digits';
      isValid = false;
    } else {
      this.validationErrors.mobile_number = '';
    }

    // Validate country
    if (!this.registerForm.country) {
      this.validationErrors.country = 'Country is required';
      isValid = false;
    } else {
      this.validationErrors.country = '';
    }

    // Validate state
    if (!this.registerForm.state) {
      this.validationErrors.state = 'State is required';
      isValid = false;
    } else {
      this.validationErrors.state = '';
    }

    // Validate city
    if (!this.registerForm.city) {
      this.validationErrors.city = 'City is required';
      isValid = false;
    } else {
      this.validationErrors.city = '';
    }

    // Validate business name
    if (!businessName) {
      this.validationErrors.business_name = 'Business name is required';
      isValid = false;
    } else if (businessName.length < 2) {
      this.validationErrors.business_name = 'Business name must be at least 2 characters';
      isValid = false;
    } else {
      this.validationErrors.business_name = '';
    }

    return isValid;
  }

  validateForm(): boolean {
    const name = this.registerForm.name.trim();
    const email = this.registerForm.email.trim();
    const mobile = this.registerForm.mobile_number;
    const businessName = this.registerForm.business_name.trim();

    return name && name.length >= 2 && /^[a-zA-Z\s]+$/.test(name) &&
           email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
           mobile && /^\d{10}$/.test(mobile) &&
           this.registerForm.country &&
           this.registerForm.state &&
           this.registerForm.city &&
           businessName && businessName.length >= 2;
  }

  resetForm(): void {
    this.registerForm = {
      name: '',
      email: '',
      mobile_number: '',
      city: '',
      state: '',
      country: '',
      business_name: ''
    };

    // Reset validation errors
    this.validationErrors = {
      name: '',
      email: '',
      mobile_number: '',
      country: '',
      state: '',
      city: '',
      business_name: ''
    };

    // Reset touched fields
    this.touchedFields = {
      name: false,
      email: false,
      mobile_number: false,
      country: false,
      state: false,
      city: false,
      business_name: false
    };
  }

  showModal(): void {
    this.cdr.detectChanges();
    if (this.registerModal) {
      this.registerModal.show();
    } else {
      $('#registerModal').modal('show');
    }
  }

  closeModal(): void {
    if (this.registerModal) {
      this.registerModal.hide();
    } else {
      $('#registerModal').modal('hide');
    }
  }

  openRegisterModal(): void {
    this.resetForm();
    setTimeout(() => {
      this.showModal();
    }, 100);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
}