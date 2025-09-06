import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaderboardService, LeaderboardPoint, LeaderboardResponse } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css'],
})
export class LeaderboardComponent implements OnInit, AfterViewInit {
  leaderboard: LeaderboardResponse = {
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
  selectedPoint: LeaderboardPoint | null = null;
  pointModal: any;
  editMode: boolean = false;
  
  newPoint = {
    name: '',
    point: 0,
    month_count: 0,
    amount_limit: 0,
    from_date: '',
    to_date: ''
  };
  
  private searchSubject = new Subject<string>();
  
  payload = {
    search: '',
    page: 1,
    limit: 10
  };

  constructor(
    private leaderboardService: LeaderboardService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.fetchLeaderboard();
    });
  }

  ngOnInit(): void {
    this.fetchLeaderboard();
  }

  ngAfterViewInit(): void {
    // Initialize modal properly with a slight delay to ensure DOM is fully loaded
    setTimeout(() => {
      const modalElement = document.getElementById('pointModal');
      if (modalElement) {
        this.pointModal = new bootstrap.Modal(modalElement);
      } else {
        console.warn('Modal element not found in the DOM');
      }
    }, 300);
  }

  // Helper method to check if TYFCB point exists in the leaderboard
  hasTYFCBPoint(): boolean {
    if (!this.leaderboard || !this.leaderboard.docs) return false;
    for (let i = 0; i < this.leaderboard.docs.length; i++) {
      if (this.leaderboard.docs[i].name === 'tyfcb') {
        return true;
      }
    }
    return false;
  }

  async fetchLeaderboard(): Promise<void> {
    this.loading = true;
    
    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        search: this.payload.search
      };
      
      const response = await this.leaderboardService.getAllLeaderboards(requestData);
      this.leaderboard = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching leaderboard points:', error);
      swalHelper.showToast('Failed to fetch leaderboard points', 'error');
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
    this.fetchLeaderboard();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchLeaderboard();
  }

  openAddPointModal(): void {
    this.editMode = false;
    this.newPoint = {
      name: '',
      point: 0,
      month_count: 0,
      amount_limit: 0,
      from_date: '',
      to_date: ''
    };
    this.showModal();
  }

  openEditPointModal(point: LeaderboardPoint): void {
    this.editMode = true;
    this.selectedPoint = point;
    
    // Reset form with current point values
    this.newPoint = {
      name: point.name,
      point: point.point,
      month_count: point.month_count || 0,
      amount_limit: point.amount_limit || 0,
      from_date: point.from_date ? this.formatDateForInput(point.from_date) : '',
      to_date: point.to_date ? this.formatDateForInput(point.to_date) : ''
    };
    
    this.showModal();
  }
  
  // Format date for input field (YYYY-MM-DD)
  formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  showModal(): void {
    if (this.pointModal) {
      this.pointModal.show();
    } else {
      try {
        const modalElement = document.getElementById('pointModal');
        if (modalElement) {
          const modalInstance = new bootstrap.Modal(modalElement);
          this.pointModal = modalInstance;
          modalInstance.show();
        } else {
          // Fallback to jQuery
          $('#pointModal').modal('show');
        }
      } catch (error) {
        console.error('Error showing modal:', error);
        // Last resort fallback
        $('#pointModal').modal('show');
      }
    }
  }
  
  closeModal(): void {
    if (this.pointModal) {
      this.pointModal.hide();
    } else {
      $('#pointModal').modal('hide');
    }
  }

  async savePoint(): Promise<void> {
    try {
      this.loading = true;
      
      // Prepare data for saving based on whether it's TYFCB or other activity
      const saveData: any = {
        name: this.newPoint.name,
        point: this.newPoint.point,
        month_count: this.newPoint.month_count
      };
      
      // Add TYFCB specific fields if applicable
      if (this.newPoint.name === 'tyfcb') {
        saveData.amount_limit = this.newPoint.amount_limit;
        
        if (this.newPoint.from_date) {
          saveData.from_date = new Date(this.newPoint.from_date);
        }
        
        if (this.newPoint.to_date) {
          saveData.to_date = new Date(this.newPoint.to_date);
        }
      }
      
      if (this.editMode && this.selectedPoint) {
        // Update existing point
        const response = await this.leaderboardService.updateLeaderboard(
          this.selectedPoint._id,
          saveData
        );
        
        if (response && response.success) {
          swalHelper.showToast('Point updated successfully', 'success');
          this.closeModal();
          this.fetchLeaderboard();
        } else {
          swalHelper.showToast(response.message || 'Failed to update point', 'error');
        }
      } else {
        // Create new point
        const response = await this.leaderboardService.createLeaderboard(saveData);
        
        if (response && response.success) {
          swalHelper.showToast('Point created successfully', 'success');
          this.closeModal();
          this.fetchLeaderboard();
        } else {
          swalHelper.showToast(response.message || 'Failed to create point', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving point:', error);
      swalHelper.showToast('Failed to save point', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deletePoint(pointId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Point',
        'Are you sure you want to delete this point? This action cannot be undone.',
        'warning'
      );
      
      if (result.isConfirmed) {
        this.loading = true;
        
        try {
          const response = await this.leaderboardService.deleteLeaderboard(pointId);
          
          if (response && response.success) {
            swalHelper.showToast('Point deleted successfully', 'success');
            this.fetchLeaderboard();
          } else {
            swalHelper.showToast(response.message || 'Failed to delete point', 'error');
          }
        } catch (error) {
          console.error('Error deleting point:', error);
          swalHelper.showToast('Failed to delete point', 'error');
        } finally {
          this.loading = false;
        }
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  // Format date helper function for display
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
  
  // Check if the activity is TYFCB
  isTYFCB(point: LeaderboardPoint): boolean {
    return point.name === 'tyfcb';
  }
}