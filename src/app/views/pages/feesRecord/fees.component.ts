import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeeService, UserFee, UserFeeResponse } from '../../../services/auth.service';
import { ChapterService, Chapter } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExportService } from '../../../services/export.service';
declare var bootstrap: any;


@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [FeeService, ChapterService, ExportService],
  templateUrl: './fees.component.html',
  styleUrls: ['./fees.component.css'],
})
export class FeesComponent implements OnInit {
  usersFees: UserFeeResponse = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 0,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null
  };
  
  chapters: Chapter[] = [];
  loading: boolean = false;
  chaptersLoading: boolean = false;
  exporting: boolean = false;
  updating: boolean = false;
  
  Math = Math;
  
  filters = {
    page: 1,
    limit: 10,
    chapter_name: null,
    search: ''
  };
  
  paginationConfig = {
    id: 'fees-pagination'
  };
  
  selectedUser: UserFee | null = null;
  feeUpdate = {
    userId: '',
    amount: 0,
    remarks: ''
  };
  
  private filterSubject = new Subject<void>();
  
  constructor(
    private feeService: FeeService,
    private chapterService: ChapterService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchUsersFees();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
    this.fetchUsersFees();
  }

  async fetchUsersFees(): Promise<void> {
    this.loading = true;
    try {
      const requestParams = {
        page: this.filters.page,
        limit: this.filters.limit,
        chapter_name: this.filters.chapter_name || undefined,
        search: this.filters.search || undefined
      };
      
      const response = await this.feeService.getAllUsersFee(requestParams);
      this.usersFees = {
        ...response,
        docs: response.docs.map(doc => ({
          ...doc,
          fees: {
            ...doc.fees,
            total_fee: doc.fees.total_fee || 0,
            paid_fee: doc.fees.paid_fee || 0,
            pending_fee: doc.fees.pending_fee || 0,
            renewal_fee: doc.fees.renewal_fee || 0,
            induction_date: doc.fees.induction_date || '',
            end_date: doc.fees.end_date || '',
            is_renewed: doc.fees.is_renewed || false,
            fee_history: doc.fees.fee_history || []
          }
        }))
      };
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching fees:', error);
      swalHelper.showToast('Failed to fetch member fees', 'error');
      this.usersFees = {
        docs: [],
        totalDocs: 0,
        limit: this.filters.limit,
        page: this.filters.page,
        totalPages: 0,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null
      };
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
    }
  }

  async fetchChapters(): Promise<void> {
    this.chaptersLoading = true;
    try {
      const response = await this.chapterService.getAllChapters({
        page: 1,
        limit: 1000,
        search: ''
      });
      this.chapters = response.docs || [];
    } catch (error) {
      console.error('Error fetching chapters:', error);
      swalHelper.showToast('Failed to fetch chapters', 'error');
    } finally {
      this.chaptersLoading = false;
    }
  }

  onFilterChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onPageChange(page: number): void {
    if (page !== this.filters.page) {
      this.filters.page = page;
      this.fetchUsersFees();
    }
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      chapter_name: null,
      search: ''
    };
    this.fetchUsersFees();
  }

  formatDate(dateString?: string): string {
    if (!dateString || isNaN(new Date(dateString).getTime())) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
    });
  }

  openFeeUpdateModal(user: UserFee): void {
    this.selectedUser = user;
    this.feeUpdate = {
      userId: user._id,
      amount: 0,
      remarks: ''
    };
    const modal = new bootstrap.Modal(document.getElementById('feeUpdateModal')!);
    modal.show();
  }

  async updateFee(): Promise<void> {
    if (!this.selectedUser) return;
    
    this.updating = true;
    try {
        console.log('Updating fee for user:', this.feeUpdate);
      await this.feeService.updateFee(this.feeUpdate);
      swalHelper.showToast('Fee updated successfully', 'success');
      const modal = bootstrap.Modal.getInstance(document.getElementById('feeUpdateModal')!);
      modal?.hide();
      this.fetchUsersFees();
    } catch (error) {
      console.error('Error updating fee:', error);
      swalHelper.showToast('Failed to update fee', 'error');
    } finally {
      this.updating = false;
    }
  }

  openFeeHistoryModal(user: UserFee): void {
    this.selectedUser = user;
    const modal = new bootstrap.Modal(document.getElementById('feeHistoryModal')!);
    modal.show();
  }

  async exportToExcel(): Promise<void> {
    try {
      this.exporting = true;
      const exportParams = {
        chapter_name: this.filters.chapter_name || undefined,
        search: this.filters.search || undefined,
        limit: 10000,
        page: 1
      };
      
      const allData = await this.feeService.getAllUsersFee(exportParams);
      
      const exportData = allData.docs.map((user, index) => {
        return {
          'Sr No': index + 1,
          'Username': user.name || 'Unknown',
          'Chapter': user.chapter_name || 'N/A',
          'Total Fee': user.fees.total_fee,
          'Paid Amount': user.fees.paid_fee,
          'Remaining Amount': user.fees.pending_fee,
          'Induction Date': this.formatDate(user.fees.induction_date),
          'Membership End': this.formatDate(user.fees.end_date),
          'Renewal Amount': user.fees.renewal_fee
        };
      });
      
      const fileName = `Member_Fees_${this.formatDateForFileName(new Date())}`;
      await this.exportService.exportToExcel(exportData, fileName);
      swalHelper.showToast('Excel file downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      swalHelper.showToast('Failed to export to Excel', 'error');
    } finally {
      this.exporting = false;
    }
  }

  async exportToPDF(): Promise<void> {
    try {
      this.exporting = true;
      const exportParams = {
        chapter_name: this.filters.chapter_name || undefined,
        search: this.filters.search || undefined,
        limit: 10000,
        page: 1
      };
      
      const allData = await this.feeService.getAllUsersFee(exportParams);
      
      const fileName = `Member_Fees_${this.formatDateForFileName(new Date())}`;
      const columns = [
        { header: 'Sr No', dataKey: 'srNo' },
        { header: 'Username', dataKey: 'username' },
        { header: 'Chapter', dataKey: 'chapter' },
        { header: 'Total Fee', dataKey: 'totalFee' },
        { header: 'Paid Amount', dataKey: 'paidAmount' },
        { header: 'Remaining Amount', dataKey: 'remainingAmount' },
        { header: 'Induction Date', dataKey: 'inductionDate' },
        { header: 'Membership End', dataKey: 'membershipEnd' },
        { header: 'Renewal Amount', dataKey: 'renewalAmount' }
      ];
      
      const data = allData.docs.map((user, index) => {
        return {
          srNo: index + 1,
          username: user.name || 'Unknown',
          chapter: user.chapter_name || 'N/A',
          totalFee: user.fees.total_fee,
          paidAmount: user.fees.paid_fee,
          remainingAmount: user.fees.pending_fee,
          inductionDate: this.formatDate(user.fees.induction_date),
          membershipEnd: this.formatDate(user.fees.end_date),
          renewalAmount: user.fees.renewal_fee
        };
      });
      
      const title = 'Member Fees Report';
      let subtitle = 'All Member Fees';
      if (this.filters.chapter_name) {
        subtitle = `Chapter: ${this.filters.chapter_name}`;
      }
      if (this.filters.search) {
        subtitle += ` | Search: ${this.filters.search}`;
      }
      
      await this.exportService.exportToPDF(columns, data, title, subtitle, fileName);
      swalHelper.showToast('PDF file downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      swalHelper.showToast('Failed to export to PDF', 'error');
    } finally {
      this.exporting = false;
    }
  }

  private formatDateForFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}