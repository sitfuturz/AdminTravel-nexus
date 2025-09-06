import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { AttendanceService1, AttendanceResponse1, Event1, Chapter } from '../../../services/auth.service';
import { ChapterService } from '../../../services/auth.service';
import { ExportService } from '../../../services/export.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-attendance-data',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [AttendanceService1, ChapterService, ExportService],
  templateUrl: './attendenceRecord.component.html',
  styleUrls: ['./attendenceRecord.component.css']
})
export class AttendanceDataComponent implements OnInit {
  chapters: Chapter[] = [];
  events: Event1[] = [];
  attendanceRecords: AttendanceResponse1['attendanceRecords'] = {
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
  eventDetails: AttendanceResponse1['eventDetails'] | null = null;
  loading: boolean = false;
  chaptersLoading: boolean = false;
  eventsLoading: boolean = false;
  exporting: boolean = false;
  toggling: { [key: string]: boolean } = {};

  Math = Math;

  filters = {
    page: 1,
    limit: 10,
    chapter: null, // Changed from '' to null
    eventId: null // Changed from '' to null
  };

  paginationConfig = {
    id: 'attendance-data-pagination'
  };

  private filterSubject = new Subject<void>();

  constructor(
    private attendanceService: AttendanceService1,
    private chapterService: ChapterService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchAttendanceRecords();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
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
      this.cdr.detectChanges();
    }
  }

  async fetchEvents(): Promise<void> {
    if (!this.filters.chapter) {
      this.events = [];
      this.filters.eventId = null; // Changed from '' to null
      this.attendanceRecords = { docs: [], totalDocs: 0, limit: 10, page: 1, totalPages: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null, pagingCounter: 1 };
      this.eventDetails = null;
      return;
    }

    this.eventsLoading = true;
    try {
      const response = await this.attendanceService.getEventsByChapter(this.filters.chapter);
      this.events = response.data.events;
    } catch (error) {
      console.error('Error fetching events:', error);
      swalHelper.showToast('Failed to fetch events', 'error');
    } finally {
      this.eventsLoading = false;
      this.cdr.detectChanges();
    }
  }

  async fetchAttendanceRecords(): Promise<void> {
    if (!this.filters.chapter || !this.filters.eventId) {
      this.attendanceRecords = { docs: [], totalDocs: 0, limit: 10, page: 1, totalPages: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null, pagingCounter: 1 };
      this.eventDetails = null;
      return;
    }

    this.loading = true;
    try {
      const response = await this.attendanceService.getAttendanceRecords({
        chapter: this.filters.chapter,
        eventId: this.filters.eventId,
        page: this.filters.page,
        limit: this.filters.limit
      });
      this.attendanceRecords = response.attendanceRecords;
      this.eventDetails = response.eventDetails;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      swalHelper.showToast('Failed to fetch attendance records', 'error');
    } finally {
      this.loading = false;
    }
  }

  async toggleAttendanceStatus(userId: string): Promise<void> {
    if (!this.filters.eventId) return;

    this.toggling[userId] = true;
    try {
      const response = await this.attendanceService.toggleAttendanceStatus({
        eventId: this.filters.eventId,
        userId
      });
      const updatedRecord = this.attendanceRecords.docs.find(record => record.userId === userId);
      if (updatedRecord) {
        updatedRecord.status = response.data.attendance.status;
      }
      swalHelper.showToast(response.message, 'success');
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error toggling attendance status:', error);
      swalHelper.showToast('Failed to toggle attendance status', 'error');
    } finally {
      this.toggling[userId] = false;
      this.cdr.detectChanges();
    }
  }

  onChapterChange(): void {
    this.filters.eventId = null; // Changed from '' to null
    this.filters.page = 1;
    this.fetchEvents();
    this.fetchAttendanceRecords();
  }

  onEventChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onFilterChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      chapter: null, // Changed from '' to null
      eventId: null // Changed from '' to null
    };
    this.events = [];
    this.attendanceRecords = { docs: [], totalDocs: 0, limit: 10, page: 1, totalPages: 1, hasPrevPage: false, hasNextPage: false, prevPage: null, nextPage: null, pagingCounter: 1 };
    this.eventDetails = null;
    this.fetchEvents();
    this.fetchAttendanceRecords();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.fetchAttendanceRecords();
  }

  async exportToExcel(): Promise<void> {
    if (!this.filters.chapter || !this.filters.eventId) {
      swalHelper.showToast('Please select a chapter and event to export', 'warning');
      return;
    }

    try {
      this.exporting = true;
      const exportParams = {
        chapter: this.filters.chapter as string, // Type assertion since we checked for null
        eventId: this.filters.eventId as string, // Type assertion since we checked for null
        limit: 10000,
        page: 1
      };

      const response = await this.attendanceService.getAttendanceRecords(exportParams);
      const exportData = response.attendanceRecords.docs.map((record, index) => ({
        'Sr No': index + 1,
        'Name': record.name || 'Unknown',
        'Chapter': record.chapter_name || 'N/A',
        'Email': record.email,
        'Mobile': record.mobile_number,
        'Status': record.status
      }));

      const fileName = `Attendance_${response.eventDetails.name}_${this.formatDateForFileName(new Date())}`;
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
    if (!this.filters.chapter || !this.filters.eventId) {
      swalHelper.showToast('Please select a chapter and event to export', 'warning');
      return;
    }

    try {
      this.exporting = true;
      const exportParams = {
        chapter: this.filters.chapter as string, // Type assertion since we checked for null
        eventId: this.filters.eventId as string, // Type assertion since we checked for null
        limit: 10000,
        page: 1
      };

      const response = await this.attendanceService.getAttendanceRecords(exportParams);
      const columns = [
        { header: 'Sr No', dataKey: 'srNo' },
        { header: 'Name', dataKey: 'name' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Mobile', dataKey: 'mobile' },
        { header: 'Status', dataKey: 'status' }
      ];

      const data = response.attendanceRecords.docs.map((record, index) => ({
        srNo: index + 1,
        name: `${record.name || 'Unknown'}\n(${record.chapter_name || 'N/A'})`,
        email: record.email,
        mobile: record.mobile_number,
        status: record.status
      }));

      const title = 'Attendance Report';
      const subtitle = `Event: ${response.eventDetails.name} | Chapter: ${response.eventDetails.chapter_name} | Date: ${new Date(response.eventDetails.date).toLocaleDateString()}`;
      const fileName = `Attendance_${response.eventDetails.name}_${this.formatDateForFileName(new Date())}`;

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