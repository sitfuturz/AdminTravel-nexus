import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { RegisterUserAuthService, User } from '../../../services/auth.service';
import { CountryService, Country } from '../../../services/auth.service';
import { StateService, State } from '../../../services/auth.service';
import { CityService, City } from '../../../services/auth.service';
// Remove ChapterService import
import { AuthService } from '../../../services/auth.service';
import { DashboardService } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  providers: [RegisterUserAuthService, CountryService, StateService, CityService, AuthService, DashboardService], // Remove ChapterService
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
    induction_date: ''
  };

  countries: Country[] = [];
  states: State[] = [];
  cities: City[] = [];
  users: User[] = [];
  
  loading: boolean = false;
  countriesLoading: boolean = false;
  statesLoading: boolean = false;
  citiesLoading: boolean = false;
  usersLoading: boolean = false;
  
  countriesLoaded: boolean = false;
  statesLoaded: boolean = false;
  citiesLoaded: boolean = false;
  usersLoaded: boolean = false;

  // Track which fields have been touched/interacted with
  touchedFields: any = {
    name: false,
    email: false,
    mobile_number: false,
    country: false,
    state: false,
    city: false,
    induction_date: false
  };

  // Validation error messages
  validationErrors: any = {
    name: '',
    email: '',
    mobile_number: '',
    country: '',
    state: '',
    city: '',
    induction_date: ''
  };

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
      this.fetchUsers();
    });
  }

  ngOnInit(): void {
    this.fetchCountries();
    this.fetchStates();
    this.fetchCities();
    this.fetchUsers();
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

  validateInductionDate(): boolean {
    if (!this.touchedFields.induction_date) {
      return true;
    }

    const induction_date = this.registerForm.induction_date;
    if (!induction_date) {
      this.validationErrors.induction_date = 'Induction date is required';
      return false;
    }

    const selectedDate = new Date(induction_date);
   
    

    this.validationErrors.induction_date = '';
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
      
        break;
      case 'induction_date':
        this.validateInductionDate();
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
      // Mark all required fields as touched before final validation
      this.markAllRequiredFieldsAsTouched();
      
      if (!this.validateFormForSubmission()) {
        swalHelper.showToast('Please fix all validation errors', 'warning');
        return;
      }

      this.loading = true;
      const formData = new FormData();
      
     Object.keys(this.registerForm).forEach(key => {
  if (key === 'profilePic' && this.registerForm[key]) {
    formData.append(key, this.registerForm[key]);
  } else if (key === 'induction_date' && this.registerForm[key]) {
    const formattedDate = new Date(this.registerForm[key]).toISOString().split('T')[0];
    formData.append(key, formattedDate);
  } else if (key === 'sponseredBy' && !this.registerForm[key]) {
    // skip adding sponsor if empty/null
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
  }

  validateFormForSubmission(): boolean {
    const name = this.registerForm.name.trim();
    const email = this.registerForm.email.trim();
    const mobile = this.registerForm.mobile_number;
    const induction_date = this.registerForm.induction_date;
    
    let isValid = true;

    // Validate all fields except chapter and role
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

    // Validate induction date
    if (!induction_date) {
      this.validationErrors.induction_date = 'Induction date is required';
      isValid = false;
    } else {
      const selectedDate = new Date(induction_date);
      const today = new Date();
      if (selectedDate > today) {
        this.validationErrors.induction_date = 'Induction date cannot be in the future';
        isValid = false;
      } else {
        this.validationErrors.induction_date = '';
      }
    }

    return isValid;
  }

  validateForm(): boolean {
    const name = this.registerForm.name.trim();
    const email = this.registerForm.email.trim();
    const mobile = this.registerForm.mobile_number;
    const induction_date = this.registerForm.induction_date;

    return name && name.length >= 2 && /^[a-zA-Z\s]+$/.test(name) &&
           email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
           mobile && /^\d{10}$/.test(mobile) &&
           this.registerForm.country &&
           this.registerForm.state &&
           this.registerForm.city &&
           induction_date && new Date(induction_date) <= new Date();
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
      induction_date: ''
    };

    // Reset validation errors
    this.validationErrors = {
      name: '',
      email: '',
      mobile_number: '',
      country: '',
      state: '',
      city: '',
      induction_date: ''
    };

    // Reset touched fields
    this.touchedFields = {
      name: false,
      email: false,
      mobile_number: false,
      country: false,
      state: false,
      city: false,
      induction_date: false
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


