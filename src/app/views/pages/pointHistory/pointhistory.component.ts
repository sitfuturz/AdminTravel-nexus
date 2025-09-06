import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { PointsHistoryService, PointsHistory, PointsHistoryResponse } from '../../../services/auth.service';
import { ChapterService, Chapter } from '../../../services/auth.service';
import { ExportService } from '../../../services/export.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { environment } from 'src/env/env.local';

@Component({
  selector: 'app-points-history',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [PointsHistoryService, ChapterService, ExportService],
  templateUrl: './pointhistory.component.html',
  styleUrls: ['./pointhistory.component.css'],
})
export class PointsHistoryComponent implements OnInit {
  pointsHistory: PointsHistoryResponse = {
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
    fromDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
    toDate: this.formatDateForInput(new Date())
  };

  paginationConfig = {
    id: 'points-history-pagination'
  };

  private filterSubject = new Subject<void>();

  constructor(
    private pointsHistoryService: PointsHistoryService,
    private chapterService: ChapterService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchPointsHistory();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
    this.fetchPointsHistory();
  }

  async fetchPointsHistory(): Promise<void> {
    this.loading = true;
    try {
      const requestParams = {
        page: this.filters.page,
        limit: this.filters.limit,
        chapter_name: this.filters.chapter_name || undefined,
        fromDate: this.filters.fromDate || undefined,
        toDate: this.filters.toDate || undefined
      };

      const response = await this.pointsHistoryService.getAllPointsHistory(requestParams);
      this.pointsHistory = {
        ...response,
        docs: response.docs.map(doc => ({
          ...doc,
          name: doc.name || 'Unknown',
          chapter_name: doc.chapter_name || 'N/A',
          profilePic: doc.profilePic || ''
        }))
      };
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching points history:', error);
      swalHelper.showToast('Failed to fetch points history', 'error');
      this.pointsHistory = {
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
      this.fetchPointsHistory();
    }
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      chapter_name: null,
      fromDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
      toDate: this.formatDateForInput(new Date())
    };
    this.fetchPointsHistory();
  }

  getProfilePicUrl(picPath?: string): string {
    if (!picPath) return 'assets/images/default-avatar.png';
    return `${environment.imageUrl}/${picPath}`;
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
        fromDate: this.filters.fromDate || undefined,
        toDate: this.filters.toDate || undefined,
        limit: 10000,
        page: 1
      };

      const allData = await this.pointsHistoryService.getAllPointsHistory(exportParams);

      const exportData = allData.docs.map((point, index) => {
        return {
          'Sr No': index + 1,
          'Name': point.name || 'Unknown',
          'Chapter': point.chapter_name || 'N/A',
          'One to One': point.one_to_one || 0,
          'Referral': point.referal || 0,
          'Regular Attendance': point.attendance_regular || 0,
          'Induction': point.induction || 0,
          'Visitor': point.visitor || 0,
          'Event Attendance': point.event_attendance || 0,
          'TYFCB': point.tyfcb || 0,
          'Testimonial': point.testimonial || 0,
          'Total Points': point.totalPointsSum || 0
        };
      });

      const fileName = `Points_History_${this.formatDateForFileName(new Date())}`;
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
        fromDate: this.filters.fromDate || undefined,
        toDate: this.filters.toDate || undefined,
        limit: 10000,
        page: 1
      };

      const allData = await this.pointsHistoryService.getAllPointsHistory(exportParams);

      const fileName = `Points_History_${this.formatDateForFileName(new Date())}`;
      const columns = [
        { header: 'Sr No', dataKey: 'srNo' },
        { header: 'Name', dataKey: 'name' },
        { header: 'Chapter', dataKey: 'chapter' },
        { header: 'One to One', dataKey: 'oneToOne' },
        { header: 'Referral', dataKey: 'referral' },
        { header: 'Regular Attendance', dataKey: 'attendanceRegular' },
        { header: 'Induction', dataKey: 'induction' },
        { header: 'Visitor', dataKey: 'visitor' },
        { header: 'Event Attendance', dataKey: 'eventAttendance' },
        { header: 'TYFCB', dataKey: 'tyfcb' },
        { header: 'Testimonial', dataKey: 'testimonial' },
        { header: 'Total Points', dataKey: 'totalPoints' }
      ];

      const data = allData.docs.map((point, index) => {
        return {
          srNo: index + 1,
          name: point.name || 'Unknown',
          chapter: point.chapter_name || 'N/A',
          oneToOne: point.one_to_one || 0,
          referral: point.referal || 0,
          attendanceRegular: point.attendance_regular || 0,
          induction: point.induction || 0,
          visitor: point.visitor || 0,
          eventAttendance: point.event_attendance || 0,
          tyfcb: point.tyfcb || 0,
          testimonial: point.testimonial || 0,
          totalPoints: point.totalPointsSum || 0
        };
      });

      const title = 'Points History Report';
      let subtitle = 'All Points History';
      if (this.filters.chapter_name) {
        subtitle = `Chapter: ${this.filters.chapter_name}`;
      }
      if (this.filters.fromDate && this.filters.toDate) {
        subtitle += ` | Period: ${this.formatDate(this.filters.fromDate)} to ${this.formatDate(this.filters.toDate)}`;
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

  private formatDate(dateString?: string): string {
    if (!dateString || isNaN(new Date(dateString).getTime())) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private formatDateForFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}