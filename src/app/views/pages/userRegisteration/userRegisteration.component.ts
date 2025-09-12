import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { RegisterUserAuthService, User } from '../../../services/auth.service';
import { CountryService, Country } from '../../../services/auth.service';
import { StateService, State } from '../../../services/auth.service';
import { CityService, City } from '../../../services/auth.service';
import { RegionService } from '../../../services/auth.service'; // Import RegionService
import { AuthService } from '../../../services/auth.service';
import { DashboardService } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';

declare var $: any;
declare var bootstrap: any;

interface Region {
  _id: string;
  name: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  providers: [RegisterUserAuthService, CountryService, StateService, CityService, RegionService, AuthService, DashboardService],
  templateUrl: './userRegisteration.component.html',
  styleUrls: ['./userRegisteration.component.css']
})
export class RegisterComponent implements OnInit, AfterViewInit {
  registerForm: any = {
    name: '',
    email: '',
    mobile_number: '',
    profilePic: null,
    date_of_birth: '',
    city: '',
    state: '',
    country: '',
    sponseredBy: null,
    keywords: '',
    induction_date: '',
    business_name: '',
    dmc_specializations: [],
    services_offered: [],
    regions: []
  };

  countries: Country[] = [];
  states: State[] = [];
  cities: City[] = [];
  users: User[] = [];
  regions: Region[] = [];
  
  loading: boolean = false;
  countriesLoading: boolean = false;
  statesLoading: boolean = false;
  citiesLoading: boolean = false;
  usersLoading: boolean = false;
  regionsLoading: boolean = false;
  
  countriesLoaded: boolean = false;
  statesLoaded: boolean = false;
  citiesLoaded: boolean = false;
  usersLoaded: boolean = false;
  regionsLoaded: boolean = false;

  // Static lists for specializations and services offered
  specializations: { name: string }[] = [
    { name: 'MICE' },
    { name: 'Adventure' },
    { name: 'Luxury' },
    { name: 'Cultural' },
    { name: 'Corporate' },
    { name: 'Leisure' },
    { name: 'Educational' },
    { name: 'Medical' },
    { name: 'Religious' },
    { name: 'Eco-Tourism' }
  ];

  servicesOffered: { name: string }[] = [
    { name: 'Hotel Booking' },
    { name: 'Transportation' },
    { name: 'Guided Tours' },
    { name: 'Event Management' },
    { name: 'Airport Transfers' },
    { name: 'Visa Assistance' },
    { name: 'Travel Insurance' },
    { name: 'Custom Packages' }
  ];

  // Track which fields have been touched/interacted with
  touchedFields: any = {
    name: false,
    email: false,
    mobile_number: false,
    country: false,
    state: false,
    city: false,
    induction_date: false,
    business_name: false,
    dmc_specializations: false,
    services_offered: false,
    regions: false
  };

  // Validation error messages
  validationErrors: any = {
    name: '',
    email: '',
    mobile_number: '',
    country: '',
    state: '',
    city: '',
    induction_date: '',
    business_name: '',
    dmc_specializations: '',
    services_offered: '',
    regions: ''
  };

  private searchSubject = new Subject<string>();
  registerModal: any;

  constructor(
    private registerService: RegisterUserAuthService,
    private countryService: CountryService,
    private stateService: StateService,
    private cityService: CityService,
    private regionService: RegionService, // Inject RegionService
    private authService: AuthService,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchUsers();
    });
  }

  ngOnInit(): void {
    this.fetchCountries();
    this.fetchStates();
    this.fetchCities();
    this.fetchUsers();
    this.fetchRegions(); // Fetch regions on init
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

  async fetchRegions(): Promise<void> {
    this.regionsLoading = true;
    this.regionsLoaded = false;
    try {
      const response = await this.regionService.getRegions({
        page: 1,
        limit: 1000,
        search: ''
      });
      this.regions = response.docs; // Assuming response.data.docs contains the region list
      this.regionsLoaded = true;
    } catch (error) {
      console.error('Error fetching regions:', error);
      swalHelper.showToast('Failed to fetch regions', 'error');
    } finally {
      this.regionsLoading = false;
      this.cdr.detectChanges();
    }
  }

  async fetchUsers(): Promise<void> {
    this.usersLoading = true;
    this.usersLoaded = false;
    try {
      const response = await this.authService.getUsers({
        page: 1,
        limit: 1000,
        search: ''
      });
      this.users = response.docs;
      this.usersLoaded = true;
    } catch (error) {
      console.error('Error fetching users:', error);
      swalHelper.showToast('Failed to fetch users', 'error');
    } finally {
      this.usersLoading = false;
      this.cdr.detectChanges();
    }
  }

  onCityChange(): void {
    if (this.registerForm.city) {
      // Any additional logic needed when city changes
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
    
    this.touchedFields.mobile_number = true;
    if (value.length === 10) {
      this.validationErrors.mobile_number = '';
    } else if (value.length > 0) {
      this.validateMobileNumber();
    }
  }

  validateName(): boolean {
    if (!this.touchedFields.name) return true;
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
    if (!this.touchedFields.email) return true;
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
    if (!this.touchedFields.mobile_number) return true;
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
    if (!this.touchedFields.country) return true;
    if (!this.registerForm.country) {
      this.validationErrors.country = 'Country is required';
      return false;
    }
    this.validationErrors.country = '';
    return true;
  }

  validateState(): boolean {
    if (!this.touchedFields.state) return true;
    if (!this.registerForm.state) {
      this.validationErrors.state = 'State is required';
      return false;
    }
    this.validationErrors.state = '';
    return true;
  }

  validateCity(): boolean {
    if (!this.touchedFields.city) return true;
    if (!this.registerForm.city) {
      this.validationErrors.city = 'City is required';
      return false;
    }
    this.validationErrors.city = '';
    return true;
  }

  validateInductionDate(): boolean {
    if (!this.touchedFields.induction_date) return true;
    const induction_date = this.registerForm.induction_date;
    if (!induction_date) {
      this.validationErrors.induction_date = 'Induction date is required';
      return false;
    }
    const selectedDate = new Date(induction_date);
    const today = new Date();
    if (selectedDate > today) {
      this.validationErrors.induction_date = 'Induction date cannot be in the future';
      return false;
    }
    this.validationErrors.induction_date = '';
    return true;
  }

  validateBusinessName(): boolean {
    if (!this.touchedFields.business_name) return true;
    const business_name = this.registerForm.business_name.trim();
    if (!business_name) {
      this.validationErrors.business_name = 'Business name is required';
      return false;
    }
    this.validationErrors.business_name = '';
    return true;
  }

  validateSpecializations(): boolean {
    if (!this.touchedFields.dmc_specializations) return true;
    if (!this.registerForm.dmc_specializations || this.registerForm.dmc_specializations.length === 0) {
      this.validationErrors.dmc_specializations = 'At least one specialization is required';
      return false;
    }
    this.validationErrors.dmc_specializations = '';
    return true;
  }

  validateServicesOffered(): boolean {
    if (!this.touchedFields.services_offered) return true;
    if (!this.registerForm.services_offered || this.registerForm.services_offered.length === 0) {
      this.validationErrors.services_offered = 'At least one service is required';
      return false;
    }
    this.validationErrors.services_offered = '';
    return true;
  }

  validateRegions(): boolean {
    if (!this.touchedFields.regions) return true;
    if (!this.registerForm.regions || this.registerForm.regions.length === 0) {
      this.validationErrors.regions = 'At least one region is required';
      return false;
    }
    this.validationErrors.regions = '';
    return true;
  }

  onFieldBlur(fieldName: string): void {
    this.touchedFields[fieldName] = true;
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
      case 'induction_date':
        this.validateInductionDate();
        break;
      case 'business_name':
        this.validateBusinessName();
        break;
      case 'dmc_specializations':
        this.validateSpecializations();
        break;
      case 'services_offered':
        this.validateServicesOffered();
        break;
      case 'regions':
        this.validateRegions();
        break;
    }
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.registerForm.profilePic = file;
    }
  }

  async registerUser(): Promise<void> {
    try {
      this.markAllRequiredFieldsAsTouched();
      if (!this.validateFormForSubmission()) {
        swalHelper.showToast('Please fix all validation errors', 'warning');
        return;
      }

      this.loading = true;
      const formData = new FormData();

      // Append all fields to FormData
      Object.keys(this.registerForm).forEach(key => {
        if (key === 'profilePic' && this.registerForm[key]) {
          formData.append(key, this.registerForm[key]);
        } else if (key === 'induction_date' && this.registerForm[key]) {
          const formattedDate = new Date(this.registerForm[key]).toISOString().split('T')[0];
          formData.append(key, formattedDate);
        } else if (key === 'sponseredBy' && !this.registerForm[key]) {
          // Skip adding sponsor if empty/null
        } else if (key === 'dmc_specializations' || key === 'services_offered' || key === 'regions') {
          // Append arrays as JSON strings or individual entries, depending on API requirements
          this.registerForm[key].forEach((item: string) => {
            formData.append(`${key}[]`, item);
          });
        } else {
          formData.append(key, this.registerForm[key]);
        }
      });

      const response = await this.registerService.registerUser(formData);
      console.log('Register response:', response);

      if (response && response.success) {
        swalHelper.showToast('User registered successfully', 'success');
        this.closeModal();
        this.resetForm();
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
    this.touchedFields.induction_date = true;
    this.touchedFields.business_name = true;
    this.touchedFields.dmc_specializations = true;
    this.touchedFields.services_offered = true;
    this.touchedFields.regions = true;
  }

  validateFormForSubmission(): boolean {
    let isValid = true;

    if (!this.validateName()) isValid = false;
    if (!this.validateEmail()) isValid = false;
    if (!this.validateMobileNumber()) isValid = false;
    if (!this.validateCountry()) isValid = false;
    if (!this.validateState()) isValid = false;
    if (!this.validateCity()) isValid = false;
    if (!this.validateInductionDate()) isValid = false;
    if (!this.validateBusinessName()) isValid = false;
    if (!this.validateSpecializations()) isValid = false;
    if (!this.validateServicesOffered()) isValid = false;
    if (!this.validateRegions()) isValid = false;

    return isValid;
  }

  validateForm(): boolean {
    return this.validateName() &&
           this.validateEmail() &&
           this.validateMobileNumber() &&
           this.validateCountry() &&
           this.validateState() &&
           this.validateCity() &&
           this.validateInductionDate() &&
           this.validateBusinessName() &&
           this.validateSpecializations() &&
           this.validateServicesOffered() &&
           this.validateRegions();
  }

  resetForm(): void {
    this.registerForm = {
      name: '',
      email: '',
      mobile_number: '',
      profilePic: null,
      date_of_birth: '',
      city: '',
      state: '',
      country: '',
      sponseredBy: null,
      keywords: '',
      induction_date: '',
      business_name: '',
      dmc_specializations: [],
      services_offered: [],
      regions: []
    };

    this.validationErrors = {
      name: '',
      email: '',
      mobile_number: '',
      country: '',
      state: '',
      city: '',
      induction_date: '',
      business_name: '',
      dmc_specializations: '',
      services_offered: '',
      regions: ''
    };

    this.touchedFields = {
      name: false,
      email: false,
      mobile_number: false,
      country: false,
      state: false,
      city: false,
      induction_date: false,
      business_name: false,
      dmc_specializations: false,
      services_offered: false,
      regions: false
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