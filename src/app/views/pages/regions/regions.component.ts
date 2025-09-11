import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegionService, Region, RegionResponse } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-regions',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [RegionService],
  templateUrl: 'regions.component.html',
  styleUrls: ['./regions.component.css'],
})
export class RegionsComponent implements OnInit, AfterViewInit {
  regions: RegionResponse = {
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
  selectedRegion: Region | null = null;
  regionModal: any;
  editMode: boolean = false;
  countryInput: string = '';
  
  newRegion = {
    name: '',
    code: '',
    description: '',
    countries: [] as string[],
    isActive: true
  };
  
  private searchSubject = new Subject<string>();
  
  payload = {
    search: '',
    page: 1,
    limit: 10
  };

  constructor(
    private regionService: RegionService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.fetchRegions();
    });
  }

  ngOnInit(): void {
    this.fetchRegions();
  }

  ngAfterViewInit(): void {
    // Initialize modal properly with a delay to ensure DOM is fully loaded
    setTimeout(() => {
      const modalElement = document.getElementById('regionModal');
      if (modalElement) {
        this.regionModal = new bootstrap.Modal(modalElement);
      } else {
        console.warn('Modal element not found in the DOM');
      }
    }, 300);
  }

  async fetchRegions(): Promise<void> {
    this.loading = true;
    
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search
      };
      
      const response = await this.regionService.getRegions(requestData);
      this.regions = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching regions:', error);
      swalHelper.showToast('Failed to fetch regions', 'error');
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
    this.fetchRegions();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchRegions();
  }

  openAddRegionModal(): void {
    this.editMode = false;
    this.newRegion = {
      name: '',
      code: '',
      description: '',
      countries: [],
      isActive: true
    };
    this.countryInput = '';
    
    this.showModal();
  }

  openEditRegionModal(region: Region): void {
    this.editMode = true;
    this.selectedRegion = region;
    this.newRegion = {
      name: region.name,
      code: region.code,
      description: region.description,
      countries: [...region.countries], // Create a copy of the array
      isActive: region.isActive
    };
    this.countryInput = '';
    
    this.showModal();
  }
  
  showModal(): void {
    // Force detect changes
    this.cdr.detectChanges();
    
    if (this.regionModal) {
      this.regionModal.show();
    } else {
      try {
        const modalElement = document.getElementById('regionModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.regionModal = modalInstance;
          modalInstance.show();
        } else {
          // Fallback to jQuery
          $('#regionModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        // Last resort fallback
        $('#regionModal').modal('show');
      }
    }
  }
  
  closeModal(): void {
    if (this.regionModal) {
      this.regionModal.hide();
    } else {
      $('#regionModal').modal('hide');
    }
  }

  addCountry(): void {
    if (this.countryInput.trim() && !this.newRegion.countries.includes(this.countryInput.trim())) {
      this.newRegion.countries.push(this.countryInput.trim());
      this.countryInput = '';
    } else if (this.newRegion.countries.includes(this.countryInput.trim())) {
      swalHelper.showToast('Country already added', 'warning');
    }
  }

  removeCountry(index: number): void {
    this.newRegion.countries.splice(index, 1);
  }

  async saveRegion(): Promise<void> {
    try {
      if (!this.newRegion.name || !this.newRegion.code || !this.newRegion.countries.length) {
        swalHelper.showToast('Please fill all required fields', 'warning');
        return;
      }
  
      // Convert code to uppercase
      this.newRegion.code = this.newRegion.code.toUpperCase();
  
      this.loading = true;
  
      const response = this.editMode && this.selectedRegion
        ? await this.regionService.updateRegion(this.selectedRegion._id, this.newRegion)
        : await this.regionService.createRegion(this.newRegion);
  
      console.log('Response:', response); // Debug log
  
      if (response && response.success) {
        swalHelper.showToast(`Region ${this.editMode ? 'updated' : 'created'} successfully`, 'success');
        this.closeModal();
        this.fetchRegions();
      } else {
        if (response?.message?.includes('already exists')) {
          swalHelper.showToast('Region already exists', 'warning');
        } else {
          swalHelper.showToast(response?.message || `Failed to ${this.editMode ? 'update' : 'create'} region`, 'error');
        }
      }
    } catch (error: any) {
      console.error('Error saving region:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
      if (error?.response?.data?.message?.includes('already exists') || error?.message?.includes('already exists')) {
        swalHelper.showToast('Region already exists', 'error');
      } else {
        swalHelper.showToast(error?.response?.data?.message || error?.message || 'Failed to save region', 'error');
      }
    } finally {
      this.loading = false;
    }
  }

  async toggleRegionStatus(region: Region): Promise<void> {
    try {
      this.loading = true;
      
      const updatedStatus = !region.isActive;
      
      const updateData = {
        name: region.name,
        description: region.description,
        countries: region.countries,
        isActive: updatedStatus
      };
      
      const response = await this.regionService.updateRegion(region._id, updateData);
      
      if (response && response.success) {
        region.isActive = updatedStatus;
        swalHelper.showToast(`Region status changed to ${updatedStatus ? 'Active' : 'Inactive'}`, 'success');
      } else {
        swalHelper.showToast(response.message || 'Failed to update region status', 'error');
      }
    } catch (error) {
      console.error('Error updating region status:', error);
      swalHelper.showToast('Failed to update region status', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deleteRegion(regionId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Region',
        'Are you sure you want to delete this region? This action cannot be undone.',
        'warning'
      );
      
      if (result.isConfirmed) {
        this.loading = true;
        
        try {
          const response = await this.regionService.deleteRegion(regionId);
          
          if (response && response.success) {
            swalHelper.showToast('Region deleted successfully', 'success');
            this.fetchRegions();
          } else {
            swalHelper.showToast(response.message || 'Failed to delete region', 'error');
          }
        } catch (error) {
          console.error('Error deleting region:', error);
          swalHelper.showToast('Failed to delete region', 'error');
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