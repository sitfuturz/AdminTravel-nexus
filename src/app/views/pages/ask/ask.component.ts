import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthService, ChapterService, Chapter, Ask, AskResponse } from '../../../services/auth.service';
import { ExportService } from '../../../services/export.service';
import { debounceTime, Subject } from 'rxjs';
import { swalHelper } from '../../../core/constants/swal-helper';

@Component({
  selector: 'app-ask-management',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [AuthService, ChapterService, ExportService],
  templateUrl: './ask.component.html',
  styleUrls: ['./ask.component.css']
})
export class AskManagementComponent implements OnInit {
  chapters: Chapter[] = [];
  asks: AskResponse = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
    pagingCounter: 1
  };
  loading: boolean = false;
  exporting: boolean = false;
  chaptersLoading: boolean = false;
  private filterSubject = new Subject<void>();
  Math = Math;

  filters = {
    page: 1,
    limit: 10,
    search: '',
    chapter_name: null as string | null
  };

  paginationConfig = {
    id: 'ask-pagination'
  };

  constructor(
    private authService: AuthService,
    private chapterService: ChapterService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchAsks();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
    this.fetchAsks();
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
      this.cdr.detectChanges();
    }
  }

  async fetchAsks(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.authService.getAllAsksForAdmin(this.filters);
      this.asks = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching asks:', error);
      swalHelper.showToast('Failed to fetch asks', 'error');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async exportToExcel(): Promise<void> {
    try {
      this.exporting = true;
      const exportParams = {
        page: 1,
        limit: 10000,
        search: this.filters.search || '',
        chapter_name: this.filters.chapter_name || undefined
      };
      const allData = await this.authService.getAllAsksForAdmin(exportParams);
      const exportData = allData.docs.map((ask, index) => {
        return {
          'Sr No': index + 1,
          'Creator': ask.user.name || 'N/A',
          'Chapter': ask.user.chapter_name || 'N/A',
          'Business Category': ask.businessCategory || 'N/A',
          'Subcategory': ask.businessSubCategory || 'N/A',
          'Product': ask.product || 'N/A',
          'Description': ask.description || 'N/A',
          'Status': ask.status ? (ask.status.charAt(0).toUpperCase() + ask.status.slice(1)) : 'N/A',
          'Created At': this.formatDate(ask.createdAt)
        };
      });
      const fileName = `Asks_Report_${this.formatDateForFileName(new Date())}`;
      await this.exportService.exportToExcel(exportData, fileName);
      swalHelper.showToast('Excel file downloaded successfully', 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      swalHelper.showToast('Failed to export to Excel', 'error');
    } finally {
      this.exporting = false;
      this.cdr.detectChanges();
    }
  }

  async exportToPDF(): Promise<void> {
    try {
      this.exporting = true;
      const exportParams = {
        page: 1,
        limit: 10000,
        search: this.filters.search || '',
        chapter_name: this.filters.chapter_name || undefined
      };
      const allData = await this.authService.getAllAsksForAdmin(exportParams);
      const fileName = `Asks_Report_${this.formatDateForFileName(new Date())}`;
      const columns = [
        { header: 'Sr No', dataKey: 'srNo' },
        { header: 'Creator', dataKey: 'creator' },
        { header: 'Chapter', dataKey: 'chapter' },
        { header: 'Business Category', dataKey: 'businessCategory' },
        { header: 'Subcategory', dataKey: 'subcategory' },
        { header: 'Product', dataKey: 'product' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Created At', dataKey: 'createdAt' }
      ];
      const data = allData.docs.map((ask, index) => {
        return {
          srNo: index + 1,
          creator: ask.user.name || 'N/A',
          chapter: ask.user.chapter_name || 'N/A',
          businessCategory: ask.businessCategory || 'N/A',
          subcategory: ask.businessSubCategory || 'N/A',
          product: ask.product || 'N/A',
          description: ask.description || 'N/A',
          status: ask.status ? (ask.status.charAt(0).toUpperCase() + ask.status.slice(1)) : 'N/A',
          createdAt: this.formatDate(ask.createdAt)
        };
      });
      const title = 'Asks Report';
      let subtitle = 'All Asks';
      if (this.filters.chapter_name) {
        subtitle = `Chapter: ${this.filters.chapter_name}`;
      }
      if (this.filters.search) {
        subtitle += ` | Search: ${this.filters.search}`;
      }
      await this.exportService.exportToPDF(columns, data, title, subtitle, fileName);
      swalHelper.showToast('PDF file downloaded successfully', 'success');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      swalHelper.showToast('Failed to export to PDF', 'error');
    } finally {
      this.exporting = false;
      this.cdr.detectChanges();
    }
  }

  onSearch(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onChapterChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onLimitChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.fetchAsks();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      search: '',
      chapter_name: null
    };
    this.fetchAsks();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatDateForFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}