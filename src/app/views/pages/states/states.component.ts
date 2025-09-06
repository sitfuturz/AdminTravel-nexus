import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService, State, StateResponse, CountryService, Country } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-states',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  templateUrl: './states.component.html',
  styleUrls: ['./states.component.css'],
})
export class StatesComponent implements OnInit, AfterViewInit {
  states: StateResponse = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 0,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  };

  countries: Country[] = [];
  loading: boolean = false;
  searchQuery: string = '';
  selectedState: State | null = null;
  stateModal: any;
  editMode: boolean = false;
  countriesLoaded: boolean = false;

  newState = {
    name: '',
    country_id: '',
    country_name: '', // Ensure country_name is included
    status: false,
  };

  private searchSubject = new Subject<string>();

  payload = {
    search: '',
    page: 1,
    limit: 10,
  };

  constructor(
    private stateService: StateService,
    private countryService: CountryService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchStates();
    });
  }

  ngOnInit(): void {
    this.fetchCountries();
    this.fetchStates();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('stateModal');
      if (modalElement) {
        this.stateModal = new bootstrap.Modal(modalElement);
      } else {
        console.warn('Modal element not found in the DOM');
      }
    }, 300);
  }

  async fetchCountries(): Promise<void> {
    try {
      this.loading = true;
      const response = await this.countryService.getAllCountries({ page: 1, limit: 100, search: '' });
      this.countries = response.docs;
      this.countriesLoaded = true;
      console.log('Fetched countries:', this.countries);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching countries:', error);
      swalHelper.showToast('Failed to fetch countries', 'error');
    } finally {
      this.loading = false;
    }
  }

  async fetchStates(): Promise<void> {
    this.loading = true;
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search,
      };
      const response = await this.stateService.getAllStates(requestData);
      this.states = response;
      console.log('Fetched states:', this.states);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching states:', error);
      swalHelper.showToast('Failed to fetch states', 'error');
    } finally {
      this.loading = false;
    }
  }

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }

  onChange(): void {
    this.payload.page = 1;
    this.fetchStates();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchStates();
  }

  openAddStateModal(): void {
    if (!this.countriesLoaded) {
      swalHelper.showToast('Please wait for countries to load', 'warning');
      return;
    }
    this.editMode = false;
    this.newState = {
      name: '',
      country_id: '',
      country_name: '',
      status: false,
    };
    this.showModal();
  }

  openEditStateModal(state: State): void {
    if (!this.countriesLoaded) {
      swalHelper.showToast('Please wait for countries to load', 'warning');
      return;
    }
    this.editMode = true;
    this.selectedState = state;
    console.log('Full state object:', JSON.stringify(state, null, 2));
    const countryId = this.getCountryIdByName(state.country_name);
    this.newState = {
      name: state.name,
      country_id: countryId || '',
      country_name: state.country_name || '',
      status: state.status,
    };
    console.log('newState after initialization:', this.newState);
    console.log('Countries available:', this.countries);
    this.cdr.detectChanges();
    setTimeout(() => this.showModal(), 100);
  }

  private getCountryIdByName(countryName: string | undefined): string | undefined {
    if (!countryName) {
      console.log('No country_name provided');
      return undefined;
    }
    const country = this.countries.find(c => c.name.toLowerCase() === countryName.toLowerCase());
    console.log(`Looking up country_id for country_name: ${countryName}, found:`, country);
    return country ? country._id : undefined;
  }

  showModal(): void {
    if (this.stateModal) {
      this.stateModal.show();
    } else {
      try {
        const modalElement = document.getElementById('stateModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.stateModal = modalInstance;
          modalInstance.show();
        } else {
          $('#stateModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        $('#stateModal').modal('show');
      }
    }
  }

  closeModal(): void {
    if (this.stateModal) {
      this.stateModal.hide();
    } else {
      $('#stateModal').modal('hide');
    }
  }

  async saveState(): Promise<void> {
    try {
      this.loading = true;
      // Set country_name based on selected country_id
      const selectedCountry = this.countries.find(c => c._id === this.newState.country_id);
      this.newState.country_name = selectedCountry ? selectedCountry.name : '';
      console.log('Payload for saveState:', this.newState); // Debug payload

      if (this.editMode && this.selectedState) {
        const response = await this.stateService.updateState(this.selectedState._id, {
          name: this.newState.name,
          country_name: this.newState.country_name,
          status: this.newState.status,
        });
        if (response && response.success) {
          swalHelper.showToast('State updated successfully', 'success');
          this.closeModal();
          this.fetchStates();
        } else {
          swalHelper.showToast(response.message || 'Failed to update state', 'error');
        }
      } else {
        const response = await this.stateService.createState({
          name: this.newState.name,
          country_name: this.newState.country_name,
          status: this.newState.status,
        });
        if (response && response.success) {
          swalHelper.showToast('State created successfully', 'success');
          this.closeModal();
          this.fetchStates();
        } else {
          swalHelper.showToast(response.message || 'Failed to create state', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving state:', error);
      swalHelper.showToast('Failed to save state', 'error');
    } finally {
      this.loading = false;
    }
  }

  async toggleStateStatus(state: State): Promise<void> {
    try {
      this.loading = true;
      const updatedStatus = !state.status;
      const countryId = this.getCountryIdByName(state.country_name);
      const country = this.countries.find(c => c._id === countryId);
      const response = await this.stateService.updateState(state._id, {
        name: state.name,
        country_name: country ? country.name : state.country_name || '',
        status: updatedStatus,
      });
      if (response && response.success) {
        state.status = updatedStatus;
        swalHelper.showToast(`State status changed to ${updatedStatus ? 'Active' : 'Inactive'}`, 'success');
      } else {
        swalHelper.showToast(response.message || 'Failed to update state status', 'error');
      }
    } catch (error) {
      console.error('Error updating state status:', error);
      swalHelper.showToast('Failed to update state status', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deleteState(stateId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete State',
        'Are you sure you want to delete this state? This action cannot be undone.',
        'warning'
      );
      if (result.isConfirmed) {
        this.loading = true;
        try {
          const response = await this.stateService.deleteState(stateId);
          if (response && response.success) {
            swalHelper.showToast('State deleted successfully', 'success');
            this.fetchStates();
          } else {
            swalHelper.showToast(response.message || 'Failed to delete state', 'error');
          }
        } catch (error) {
          console.error('Error deleting state:', error);
          swalHelper.showToast('Failed to delete state', 'error');
        } finally {
          this.loading = false;
        }
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
}