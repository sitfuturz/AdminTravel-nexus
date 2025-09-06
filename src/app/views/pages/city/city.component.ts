import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CityService, City, CityResponse } from '../../../services/auth.service';
import { StateService, State } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-cities',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [CityService, StateService],
  templateUrl: './city.component.html',
  styleUrls: ['./city.component.css'],
})
export class CitiesComponent implements OnInit, AfterViewInit {
  cities: CityResponse = {
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

  states: State[] = [];
  loading: boolean = false;
  statesLoading: boolean = false;
  searchQuery: string = '';
  selectedCity: City | null = null;
  cityModal: any;
  editMode: boolean = false;
  statesLoaded: boolean = false;

  newCity = {
    name: '',
    state_id: '',
    state_name: '', // Add state_name
    status: false,
  };

  private searchSubject = new Subject<string>();

  payload = {
    search: '',
    page: 1,
    limit: 10,
  };

  constructor(
    private cityService: CityService,
    private stateService: StateService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchCities();
    });
  }

  ngOnInit(): void {
    this.fetchStates(); // Fetch states first
    this.fetchCities();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('cityModal');
      if (modalElement) {
        this.cityModal = new bootstrap.Modal(modalElement);
      } else {
        console.warn('Modal element not found in the DOM');
      }
    }, 300);
  }

  async fetchCities(): Promise<void> {
    this.loading = true;
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search,
      };
      const response = await this.cityService.getAllCities(requestData);
      this.cities = response;
      console.log('Fetched cities:', this.cities);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching cities:', error);
      swalHelper.showToast('Failed to fetch cities', 'error');
    } finally {
      this.loading = false;
    }
  }

  async fetchStates(): Promise<void> {
    this.statesLoading = true;
    this.statesLoaded = false;
    try {
      const response = await this.stateService.getAllStates({
        page: 1,
        limit: 1000,
        search: '',
      });
      this.states = response.docs;
      this.statesLoaded = true;
      console.log('Fetched states:', this.states);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching states:', error);
      swalHelper.showToast('Failed to fetch states', 'error');
    } finally {
      this.statesLoading = false;
    }
  }

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }

  onChange(): void {
    this.payload.page = 1;
    this.fetchCities();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchCities();
  }

  openAddCityModal(): void {
    if (!this.statesLoaded) {
      swalHelper.showToast('Please wait for states to load', 'warning');
      return;
    }
    this.editMode = false;
    this.newCity = {
      name: '',
      state_id: '',
      state_name: '',
      status: false,
    };
    this.showModal();
  }

  openEditCityModal(city: City): void {
    if (!this.statesLoaded) {
      swalHelper.showToast('Please wait for states to load', 'warning');
      return;
    }
    this.editMode = true;
    this.selectedCity = city;
    console.log('Full city object:', JSON.stringify(city, null, 2));
    const stateId = this.getStateIdByName(city.state_name) || city.state_id || '';
    this.newCity = {
      name: city.name,
      state_id: stateId,
      state_name: city.state_name || '',
      status: city.status,
    };
    console.log('newCity after initialization:', this.newCity);
    console.log('States available:', this.states);
    this.cdr.detectChanges();
    setTimeout(() => this.showModal(), 100);
  }

  private getStateIdByName(stateName: string | undefined): string | undefined {
    if (!stateName) {
      console.log('No state_name provided');
      return undefined;
    }
    const state = this.states.find(s => s.name.toLowerCase() === stateName.toLowerCase());
    console.log(`Looking up state_id for state_name: ${stateName}, found:`, state);
    return state ? state._id : undefined;
  }

  showModal(): void {
    this.cdr.detectChanges();
    if (this.cityModal) {
      this.cityModal.show();
    } else {
      try {
        const modalElement = document.getElementById('cityModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.cityModal = modalInstance;
          modalInstance.show();
        } else {
          $('#cityModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        $('#cityModal').modal('show');
      }
    }
  }

  closeModal(): void {
    if (this.cityModal) {
      this.cityModal.hide();
    } else {
      $('#cityModal').modal('hide');
    }
  }

  async saveCity(): Promise<void> {
    try {
      this.loading = true;
      // Set state_name based on selected state_id
      const selectedState = this.states.find(s => s._id === this.newCity.state_id);
      this.newCity.state_name = selectedState ? selectedState.name : '';
      console.log('Payload for saveCity:', this.newCity);

      if (this.editMode && this.selectedCity) {
        const response = await this.cityService.updateCity(this.selectedCity._id, {
          name: this.newCity.name,
          state_name: this.newCity.state_name,
          status: this.newCity.status,
        });
        if (response && response.success) {
          swalHelper.showToast('City updated successfully', 'success');
          this.closeModal();
          this.fetchCities();
        } else {
          swalHelper.showToast(response.message || 'Failed to update city', 'error');
        }
      } else {
        const response = await this.cityService.createCity({
          name: this.newCity.name,
          state_name: this.newCity.state_name,
          status: this.newCity.status,
        });
        if (response && response.success) {
          swalHelper.showToast('City created successfully', 'success');
          this.closeModal();
          this.fetchCities();
        } else {
          swalHelper.showToast(response.message || 'Failed to create city', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving city:', error);
      swalHelper.showToast('Failed to save city', 'error');
    } finally {
      this.loading = false;
    }
  }

  async toggleCityStatus(city: City): Promise<void> {
    try {
      this.loading = true;
      const updatedStatus = !city.status;
      const stateId = this.getStateIdByName(city.state_name) || city.state_id;
      const state = this.states.find(s => s._id === stateId);
      const response = await this.cityService.updateCity(city._id, {
        name: city.name,
        state_name: state ? state.name : city.state_name || '',
        status: updatedStatus,
      });
      if (response && response.success) {
        city.status = updatedStatus;
        swalHelper.showToast(`City status changed to ${updatedStatus ? 'Active' : 'Inactive'}`, 'success');
      } else {
        swalHelper.showToast(response.message || 'Failed to update city status', 'error');
      }
    } catch (error) {
      console.error('Error updating city status:', error);
      swalHelper.showToast('Failed to update city status', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deleteCity(cityId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete City',
        'Are you sure you want to delete this city? This action cannot be undone.',
        'warning'
      );
      if (result.isConfirmed) {
        this.loading = true;
        try {
          const response = await this.cityService.deleteCity(cityId);
          if (response && response.success) {
            swalHelper.showToast('City deleted successfully', 'success');
            this.fetchCities();
          } else {
            swalHelper.showToast(response.message || 'Failed to delete city', 'error');
          }
        } catch (error) {
          console.error('Error deleting city:', error);
          swalHelper.showToast('Failed to delete city', 'error');
        } finally {
          this.loading = false;
        }
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  getStateName(stateId: string): string {
    if (!stateId) return 'Unknown';
    const state = this.states.find(s => s._id === stateId);
    return state ? state.name : 'Unknown';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
}