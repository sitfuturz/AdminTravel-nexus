import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TyfcbService, Tyfcb, TyfcbResponse } from '../../../services/auth.service';
import { ChapterService, Chapter } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExportService } from '../../../services/export.service';
import { environment } from 'src/env/env.local';

@Component({
  selector: 'app-tyfcb',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [TyfcbService, ChapterService, ExportService],
  templateUrl: './tyfcb.component.html',
  styleUrls: ['./tyfcb.component.css'],
})
export class TyfcbComponent implements OnInit {
  tyfcbs: TyfcbResponse = {
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
  
  Math = Math;
  
  filters = {
    page: 1,
    limit: 10,
    chapter_name: null,
    startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
    endDate: this.formatDateForInput(new Date())
  };
  
  paginationConfig = {
    id: 'tyfcb-pagination'
  };
  
  private filterSubject = new Subject<void>();
  
  constructor(
    private tyfcbService: TyfcbService,
    private chapterService: ChapterService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchTyfcbs();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
    this.fetchTyfcbs();
  }

  async fetchTyfcbs(): Promise<void> {
    this.loading = true;
    try {
      const requestParams = {
        page: this.filters.page,
        limit: this.filters.limit,
        chapter_name: this.filters.chapter_name || undefined,
        startDate: this.filters.startDate || undefined,
        endDate: this.filters.endDate || undefined
      };
      const response = await this.tyfcbService.getAllTyfcbs(requestParams);
      this.tyfcbs = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching TYFCB records:', error);
      swalHelper.showToast('Failed to fetch TYFCB records', 'error');
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
    this.fetchTyfcbs();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      chapter_name: null,
      startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
      endDate: this.formatDateForInput(new Date())
    };
    this.fetchTyfcbs();
  }

  getProfilePicUrl(picPath: string): string {
    if (!picPath) return 'assets/images/default-avatar.png';
    return `${environment.imageUrl}/${picPath}`;
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

  formatCurrency(amount: number, currency: string): string {
    if (currency === 'rupee') {
      return `₹${amount.toLocaleString('en-IN')}`;
    } else if (currency === 'dollar') {
      return `$${amount.toLocaleString('en-US')}`;
    } else {
      return `${amount.toLocaleString()}`;
    }
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
      const exportParams = {
        chapter_name: this.filters.chapter_name || undefined,
        startDate: this.filters.startDate || undefined,
        endDate: this.filters.endDate || undefined,
        limit: 10000,
        page: 1
      };
      const allData = await this.tyfcbService.getAllTyfcbs(exportParams);
      const exportData = allData.docs.map((tyfcb, index) => {
        return {
          'Sr No': index + 1,
          'TYFCB From': tyfcb.giverId?.name || 'Unknown',
          'From Chapter': tyfcb.giverId?.chapter_name || 'N/A',
          'TYFCB To': tyfcb.receiverId?.name || 'Unknown',
          'To Chapter': tyfcb.receiverId?.chapter_name || 'N/A',
          'Amount': this.formatCurrency(tyfcb.amount, tyfcb.currency),
          'Business Type': tyfcb.business_type || 'N/A',
          'Referral Type': tyfcb.referral_type || 'N/A',
          'Comments': tyfcb.comments || 'No comments',
          'Date': this.formatDate(tyfcb.createdAt)
        };
      });
      const fileName = `TYFCB_Report_${this.formatDateForFileName(new Date())}`;
      await this.exportService.exportToExcel(exportData, fileName);
      swalHelper.showToast('Excel file downloaded successfully', 'success');
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
        startDate: this.filters.startDate || undefined,
        endDate: this.filters.endDate || undefined,
        limit: 10000,
        page: 1
      };
      const allData = await this.tyfcbService.getAllTyfcbs(exportParams);
      const fileName = `TYFCB_Report_${this.formatDateForFileName(new Date())}`;
      const columns = [
        { header: 'Sr No', dataKey: 'srNo' },
        { header: 'From', dataKey: 'from' },
        { header: 'To', dataKey: 'to' },
        { header: 'Amount', dataKey: 'amount' },
        { header: 'Business Type', dataKey: 'businessType' },
        { header: 'Referral Type', dataKey: 'referralType' },
        { header: 'Date', dataKey: 'date' }
      ];
      const data = allData.docs.map((tyfcb, index) => {
        return {
          srNo: index + 1,
          from: `${tyfcb.giverId?.name || 'Unknown'}\n(${tyfcb.giverId?.chapter_name || 'N/A'})`,
          to: `${tyfcb.receiverId?.name || 'Unknown'}\n(${tyfcb.receiverId?.chapter_name || 'N/A'})`,
          amount: this.formatCurrency(tyfcb.amount, tyfcb.currency),
          businessType: tyfcb.business_type || 'N/A',
          referralType: tyfcb.referral_type || 'N/A',
          date: this.formatDate(tyfcb.createdAt)
        };
      });
      const title = 'TYFCB Report';
      let subtitle = 'All TYFCB Records';
      if (this.filters.chapter_name) {
        subtitle = `Chapter: ${this.filters.chapter_name}`;
      }
      if (this.filters.startDate && this.filters.endDate) {
        subtitle += ` | Period: ${this.formatDate(this.filters.startDate)} to ${this.formatDate(this.filters.endDate)}`;
      }
      await this.exportService.exportToPDF(columns, data, title, subtitle, fileName);
      swalHelper.showToast('PDF file downloaded successfully', 'success');
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