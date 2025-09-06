import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CountryService, Country, CountryResponse } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-countries',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  templateUrl: './country.component.html',
  styleUrls: ['./country.component.css'],
})
export class CountriesComponent implements OnInit, AfterViewInit {
  countries: CountryResponse = {
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
  searchQuery: string = '';
  selectedCountry: Country | null = null;
  countryModal: any;
  editMode: boolean = false;
  
  newCountry = {
    name: '',
    status: false
  };
  
  private searchSubject = new Subject<string>();
  
  payload = {
    search: '',
    page: 1,
    limit: 10
  };

  constructor(
    private countryService: CountryService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.fetchCountries();
    });
  }

  ngOnInit(): void {
    this.fetchCountries();
  }

  ngAfterViewInit(): void {
    // Initialize modal properly with a slight delay to ensure DOM is fully loaded
    setTimeout(() => {
      const modalElement = document.getElementById('countryModal');
      if (modalElement) {
        this.countryModal = new bootstrap.Modal(modalElement);
      } else {
        console.warn('Modal element not found in the DOM');
      }
    }, 300);
  }

  async fetchCountries(): Promise<void> {
    this.loading = true;
    
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search
      };
      
      const response = await this.countryService.getAllCountries(requestData);
      this.countries = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching countries:', error);
      swalHelper.showToast('Failed to fetch countries', 'error');
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
    this.fetchCountries();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchCountries();
  }

  openAddCountryModal(): void {
    this.editMode = false;
    this.newCountry = {
      name: '',
      status: false
    };
    this.showModal();
  }

  openEditCountryModal(country: Country): void {
    this.editMode = true;
    this.selectedCountry = country;
    this.newCountry = {
      name: country.name,
      status: country.status
    };
    this.showModal();
  }
  
  showModal(): void {
    if (this.countryModal) {
      this.countryModal.show();
    } else {
      try {
        const modalElement = document.getElementById('countryModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.countryModal = modalInstance;
          modalInstance.show();
        } else {
          // Fallback to jQuery
          $('#countryModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        // Last resort fallback
        $('#countryModal').modal('show');
      }
    }
  }
  
  closeModal(): void {
    if (this.countryModal) {
      this.countryModal.hide();
    } else {
      $('#countryModal').modal('hide');
    }
  }

  async saveCountry(): Promise<void> {
    try {
      this.loading = true;
      
      if (this.editMode && this.selectedCountry) {
        // Update existing country
        const response = await this.countryService.updateCountry(
          this.selectedCountry._id,
          this.newCountry
        );
        
        if (response && response.success) {
          swalHelper.showToast('Country updated successfully', 'success');
          this.closeModal();
          this.fetchCountries();
        } else {
          swalHelper.showToast(response.message || 'Failed to update country', 'error');
        }
      } else {
        // Create new country
        const response = await this.countryService.createCountry(this.newCountry);
        
        if (response && response.success) {
          swalHelper.showToast('Country created successfully', 'success');
          this.closeModal();
          this.fetchCountries();
        } else {
          swalHelper.showToast(response.message || 'Failed to create country', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving country:', error);
      swalHelper.showToast('Failed to save country', 'error');
    } finally {
      this.loading = false;
    }
  }

  async toggleCountryStatus(country: Country): Promise<void> {
    try {
      this.loading = true;
      
      const updatedStatus = !country.status;
      
      const response = await this.countryService.updateCountry(
        country._id,
        { name: country.name, status: updatedStatus }
      );
      
      if (response && response.success) {
        country.status = updatedStatus;
        swalHelper.showToast(`Country status changed to ${updatedStatus ? 'Active' : 'Inactive'}`, 'success');
      } else {
        swalHelper.showToast(response.message || 'Failed to update country status', 'error');
      }
    } catch (error) {
      console.error('Error updating country status:', error);
      swalHelper.showToast('Failed to update country status', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deleteCountry(countryId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Country',
        'Are you sure you want to delete this country? This action cannot be undone.',
        'warning'
      );
      
      if (result.isConfirmed) {
        this.loading = true;
        
        try {
          const response = await this.countryService.deleteCountry(countryId);
          
          if (response && response.success) {
            swalHelper.showToast('Country deleted successfully', 'success');
            this.fetchCountries();
          } else {
            swalHelper.showToast(response.message || 'Failed to delete country', 'error');
          }
        } catch (error) {
          console.error('Error deleting country:', error);
          swalHelper.showToast('Failed to delete country', 'error');
        } finally {
          this.loading = false;
        }
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  // Format date helper function
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
}