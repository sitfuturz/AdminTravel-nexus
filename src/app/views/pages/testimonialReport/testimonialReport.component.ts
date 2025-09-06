import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestimonialService, Testimonial, TestimonialResponse } from '../../../services/auth.service';
import { ChapterService, Chapter } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExportService } from '../../../services/export.service';
import { environment } from 'src/env/env.local';

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [TestimonialService, ChapterService, ExportService],
  templateUrl: './testimonialReport.component.html',
  styleUrls: ['./testimonialReport.component.css'],
})
export class TestimonialsComponent implements OnInit {
  testimonials: TestimonialResponse = {
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
  
  // Add Math object for use in template
  Math = Math;
  
  filters = {
    page: 1,
    limit: 10,
    chapterName: null,
    startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
    endDate: this.formatDateForInput(new Date())
  };
  
  // Pagination configuration
  paginationConfig = {
    id: 'testimonial-pagination'
  };
  
  private filterSubject = new Subject<void>();
  
  constructor(
    private testimonialService: TestimonialService,
    private chapterService: ChapterService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchTestimonials();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
    this.fetchTestimonials();
  }

  async fetchTestimonials(): Promise<void> {
    this.loading = true;
    try {
      const requestParams = {
        page: this.filters.page,
        limit: this.filters.limit,
        chapterName: this.filters.chapterName || undefined,
        startDate: this.filters.startDate || undefined,
        endDate: this.filters.endDate || undefined
      };
      
      const response = await this.testimonialService.getAllTestimonials(requestParams);
      this.testimonials = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      swalHelper.showToast('Failed to fetch testimonials', 'error');
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
    this.fetchTestimonials();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      chapterName: null,
      startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
      endDate: this.formatDateForInput(new Date())
    };
    this.fetchTestimonials();
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
        chapterName: this.filters.chapterName || undefined,
        startDate: this.filters.startDate || undefined,
        endDate: this.filters.endDate || undefined,
        limit: 10000,
        page: 1
      };
      const allData = await this.testimonialService.getAllTestimonials(exportParams);
      const exportData = allData.docs.map((testimonial, index) => {
        return {
          'Sr No': index + 1,
          'Given By': testimonial.giverId?.name || 'Unknown',
          'From Chapter': testimonial.giverId?.chapter_name || 'N/A',
          'Given To': testimonial.receiverId?.name || 'General Testimonial',
          'To Chapter': testimonial.receiverId?.chapter_name || 'N/A',
          'Comments': testimonial.message || 'No comments',
          'Selected': testimonial.selected ? 'Yes' : 'No',
          'Date': this.formatDate(testimonial.createdAt)
        };
      });
      const fileName = `Testimonials_Report_${this.formatDateForFileName(new Date())}`;
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
        chapterName: this.filters.chapterName || undefined,
        startDate: this.filters.startDate || undefined,
        endDate: this.filters.endDate || undefined,
        limit: 10000,
        page: 1
      };
      const allData = await this.testimonialService.getAllTestimonials(exportParams);
      const fileName = `Testimonials_Report_${this.formatDateForFileName(new Date())}`;
      const columns = [
        { header: 'Sr No', dataKey: 'srNo' },
        { header: 'Given By', dataKey: 'givenBy' },
        { header: 'Given To', dataKey: 'givenTo' },
        { header: 'Comments', dataKey: 'comments' },
        { header: 'Selected', dataKey: 'selected' },
        { header: 'Date', dataKey: 'date' }
      ];
      const data = allData.docs.map((testimonial, index) => {
        return {
          srNo: index + 1,
          givenBy: `${testimonial.giverId?.name || 'Unknown'}\n(${testimonial.giverId?.chapter_name || 'N/A'})`,
          givenTo: testimonial.receiverId ? 
            `${testimonial.receiverId?.name || 'Unknown'}\n(${testimonial.receiverId?.chapter_name || 'N/A'})` : 
            'General Testimonial',
          comments: testimonial.message || 'No comments',
          selected: testimonial.selected ? 'Yes' : 'No',
          date: this.formatDate(testimonial.createdAt)
        };
      });
      const title = 'Testimonials Report';
      let subtitle = 'All Testimonials';
      if (this.filters.chapterName) {
        subtitle = `Chapter: ${this.filters.chapterName}`;
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