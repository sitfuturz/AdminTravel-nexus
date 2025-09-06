import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReferralServiceRecieved, Referral, ReferralResponse } from '../../../services/auth.service';
import { ChapterService, Chapter } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExportService } from '../../../services/export.service';

@Component({
  selector: 'app-referrals',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [ReferralServiceRecieved, ChapterService, ExportService],
  templateUrl: './referralReportRecieved.component.html',
  styleUrls: ['./referralReportRecieved.component.css'],
})
export class ReferralsComponentRecieved implements OnInit {
  referrals: ReferralResponse = {
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

  chapters: Chapter[] = [];
  loading: boolean = false;
  chaptersLoading: boolean = false;
  exporting: boolean = false;

  Math = Math;

  filters = {
    page: 1,
    limit: 10,
    chapterName: null,
    startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
    endDate: this.formatDateForInput(new Date())
  };

  paginationConfig = {
    id: 'referral-received-pagination'
  };

  private filterSubject = new Subject<void>();

  constructor(
    private referralService: ReferralServiceRecieved,
    private chapterService: ChapterService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchReferrals();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
    this.fetchReferrals();
  }

  async fetchReferrals(): Promise<void> {
    this.loading = true;
    try {
      const requestParams: any = {
        page: this.filters.page,
        limit: this.filters.limit
      };
      if (this.filters.chapterName) requestParams.chapterName = this.filters.chapterName;
      if (this.filters.startDate) requestParams.startDate = this.filters.startDate;
      if (this.filters.endDate) requestParams.endDate = this.filters.endDate;

      const response = await this.referralService.getAllReferrals(requestParams);
      this.referrals = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching referrals:', error);
      swalHelper.showToast('Failed to fetch referrals', 'error');
      this.referrals = {
        docs: [],
        totalDocs: 0,
        limit: this.filters.limit,
        page: this.filters.page,
        totalPages: 0,
        pagingCounter: 1,
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
      this.chapters = response.docs|| [];
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
    this.filters.page = page;
    this.fetchReferrals();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      chapterName: null,
      startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
      endDate: this.formatDateForInput(new Date())
    };
    this.fetchReferrals();
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      
    });
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async exportToExcel(): Promise<void> {
    try {
      this.exporting = true;
      const exportParams: any = {
        page: 1,
        limit: 10000
      };
      if (this.filters.chapterName) exportParams.chapterName = this.filters.chapterName;
      if (this.filters.startDate) exportParams.startDate = this.filters.startDate;
      if (this.filters.endDate) exportParams.endDate = this.filters.endDate;

      const allData = await this.referralService.getAllReferrals(exportParams);

      if (!allData.docs || allData.docs.length === 0) {
        swalHelper.showToast('No referrals found for the selected filters', 'warning');
        return;
      }

      const exportData = allData.docs.map((referral, index) => {
        return {
          'Sr No': index + 1,
          'Referral From': String(referral.giver_id?.name || 'Unknown').replace(/[\r\n\t]/g, ' '),
          'From Chapter': String(referral.giver_id?.chapter_name || 'N/A').replace(/[\r\n\t]/g, ' '),
          'Referral To': String(referral.receiver_id?.name || 'External Referral').replace(/[\r\n\t]/g, ' '),
          'To Chapter': String(referral.receiver_id?.chapter_name || 'N/A').replace(/[\r\n\t]/g, ' '),
          'Referral Type': referral.referral_type === 'inside' ? 'Inside' : 'Outside',
          'Referral': String(referral.referral || '').replace(/[\r\n\t]/g, ' '),
          'Mobile No': String(referral.mobile_number || '').replace(/[\r\n\t]/g, ' '),
          'Comments': String(referral.comments || 'No comments').replace(/[\r\n\t]/g, ' '),
          'Rating': Number(referral.rating || 0),
          'Date': this.formatDate(referral.createdAt)
        };
      });

      const fileName = `Referrals_Received_Report_${this.formatDateForFileName(new Date())}`;
      await this.exportService.exportToExcel(exportData, fileName);
      swalHelper.showToast('Excel file downloaded successfully', 'success');
    } catch (error: any) {
      console.error('Error exporting to Excel:', {
        message: error.message,
        stack: error.stack,
        errorResponse: error.response || 'No response data'
      });
      swalHelper.showToast(`Failed to export to Excel: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      this.exporting = false;
    }
  }

  async exportToPDF(): Promise<void> {
    try {
      this.exporting = true;
      const exportParams: any = {
        page: 1,
        limit: 10000
      };
      if (this.filters.chapterName) exportParams.chapterName = this.filters.chapterName;
      if (this.filters.startDate) exportParams.startDate = this.filters.startDate;
      if (this.filters.endDate) exportParams.endDate = this.filters.endDate;

      const allData = await this.referralService.getAllReferrals(exportParams);

      if (!allData.docs || allData.docs.length === 0) {
        swalHelper.showToast('No referrals found for the selected filters', 'warning');
        return;
      }

      const fileName = `Referrals_Received_Report_${this.formatDateForFileName(new Date())}`;
      const columns = [
        { header: 'Sr No', dataKey: 'srNo' },
        { header: 'Referral From', dataKey: 'fromName' },
        { header: 'Referral To', dataKey: 'toName' },
        { header: 'Type', dataKey: 'type' },
        { header: 'Referral', dataKey: 'referral' },
        { header: 'Mobile', dataKey: 'mobile' },
        { header: 'Date', dataKey: 'date' }
      ];

      const data = allData.docs.map((referral, index) => {
        return {
          srNo: index + 1,
          fromName: `${referral.giver_id?.name || 'Unknown'}\n(${referral.giver_id?.chapter_name || 'N/A'})`,
          toName: referral.receiver_id
            ? `${referral.receiver_id?.name || 'Unknown'}\n(${referral.receiver_id?.chapter_name || 'N/A'})`
            : 'External Referral',
          type: referral.referral_type === 'inside' ? 'Inside' : 'Outside',
          referral: referral.referral,
          mobile: referral.mobile_number,
          date: this.formatDate(referral.createdAt)
        };
      });

      const title = 'Referrals Received Report';
      let subtitle = 'All Received Referrals';
      if (this.filters.chapterName) {
        subtitle = `Chapter: ${this.filters.chapterName}`;
      }
      if (this.filters.startDate && this.filters.endDate) {
        subtitle += ` | Period: ${this.formatDate(this.filters.startDate)} to ${this.formatDate(this.filters.endDate)}`;
      }

      await this.exportService.exportToPDF(columns, data, title, subtitle, fileName);
      swalHelper.showToast('PDF file downloaded successfully', 'success');
    } catch (error: any) {
      console.error('Error exporting to PDF:', {
        message: error.message,
        stack: error.stack,
        response: error.response || 'No response data'
      });
      swalHelper.showToast(`Failed to export to PDF: ${error.message || 'Unknown error'}`, 'error');
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