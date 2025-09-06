import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { VisitorService, Visitor, VisitorResponse, UserRef } from '../../../services/auth.service';
import { ChapterService, Chapter } from '../../../services/auth.service';
import { AttendanceService1, Event1 } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExportService } from '../../../services/export.service';
import { environment } from 'src/env/env.local';

@Component({
  selector: 'app-visitors',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxPaginationModule, NgSelectModule],
  providers: [VisitorService, ChapterService, AttendanceService1, ExportService],
  templateUrl: './visitors.component.html',
  styleUrls: ['./visitors.component.css'],
})
export class VisitorsComponent implements OnInit {
  visitors: VisitorResponse = {
    docs: [],
    totalDocs: 0,
    limit: 10,
    page: 1,
    totalPages: 0,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  };

  chapters: Chapter[] = [];
  events: Event1[] = [];
  users: UserRef[] = [];
  loading: boolean = false;
  chaptersLoading: boolean = false;
  exporting: boolean = false;
  updatingVisitorId: string | null = null;
  toggling: { [key: string]: boolean } = {};
  showAddVisitorModal: boolean = false;
  addVisitorForm: FormGroup;
  modalLoading: boolean = false;

  Math = Math;

  filters = {
    page: 1,
    limit: 10,
    chapterName: null,
    startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
    endDate: this.formatDateForInput(new Date()),
  };

  paginationConfig = {
    id: 'visitor-pagination',
  };

  private filterSubject = new Subject<void>();

  constructor(
    private visitorService: VisitorService,
    private chapterService: ChapterService,
    private attendanceService: AttendanceService1,
    private exportService: ExportService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.addVisitorForm = this.fb.group({
      chapterName: ['', Validators.required],
      eventId: ['', Validators.required],
      refUserId: ['', Validators.required],
      name: ['', Validators.required],
      mobile_number: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      email: ['', [Validators.email]],
      business_name: [''],
      business_type: [''],
      address: [''],
      pincode: ['', [Validators.pattern(/^\d{6}$/)]],
      fees: [0, [Validators.min(0)]],
      paid: [false],
    });

    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchVisitors();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
    this.filterSubject.next();
  }

  async fetchVisitors(): Promise<void> {
    this.loading = true;
    try {
      const requestParams = {
        page: this.filters.page,
        limit: this.filters.limit,
        chapter_name: this.filters.chapterName || undefined,
        startDate: this.filters.startDate || undefined,
        endDate: this.filters.endDate || undefined,
      };
      const response = await this.visitorService.getAllVisitors(requestParams);
      this.visitors = {
        ...response,
        docs: response.docs.filter((visitor) => visitor && visitor._id && visitor.name),
      };
      // Sync filters with server response
      this.filters.page = this.visitors.page;
      this.filters.limit = this.visitors.limit;
      console.log('Visitors response:', this.visitors); // Debug log
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching visitors:', error);
      swalHelper.showToast('Failed to fetch visitors', 'error');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async fetchChapters(): Promise<void> {
    this.chaptersLoading = true;
    try {
      const response = await this.chapterService.getAllChapters({
        page: 1,
        limit: 1000,
        search: '',
      });
      this.chapters = response.docs || [];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching chapters:', error);
      swalHelper.showToast('Failed to fetch chapters', 'error');
    } finally {
      this.chaptersLoading = false;
      this.cdr.detectChanges();
    }
  }

  async onChapterChange(chapterName: string): Promise<void> {
    if (!chapterName) {
      this.events = [];
      this.users = [];
      this.addVisitorForm.patchValue({ eventId: '', refUserId: '' });
      this.cdr.detectChanges();
      return;
    }

    this.modalLoading = true;
    try {
      const eventResponse = await this.attendanceService.getEventsByChapter(chapterName);
      this.events = [...(eventResponse.data.events || [])];
      const userResponse = await this.visitorService.getUsersByChapter({
        chapter_name: chapterName,
        search: '',
      });
      this.users = [...(userResponse.data?.docs || [])];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching chapter data:', error);
      swalHelper.showToast('Failed to fetch chapter data', 'error');
    } finally {
      this.modalLoading = false;
      this.cdr.detectChanges();
    }
  }

  async onUserSearch(event: { term: string; items: any[] }): Promise<void> {
    const chapterName = this.addVisitorForm.get('chapterName')?.value;
    if (!chapterName) {
      this.users = [];
      this.cdr.detectChanges();
      return;
    }

    this.modalLoading = true;
    try {
      const userResponse = await this.visitorService.getUsersByChapter({
        chapter_name: chapterName,
        search: event.term || '',
      });
      this.users = [...(userResponse.data?.docs || [])];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching users:', error);
      swalHelper.showToast('Failed to fetch users', 'error');
    } finally {
      this.modalLoading = false;
      this.cdr.detectChanges();
    }
  }

  openAddVisitorModal(): void {
    this.showAddVisitorModal = true;
    this.addVisitorForm.reset({
      fees: 0,
      paid: false,
    });
    this.events = [];
    this.users = [];
    this.cdr.detectChanges();
  }

  closeAddVisitorModal(): void {
    this.showAddVisitorModal = false;
    this.addVisitorForm.reset();
    this.events = [];
    this.users = [];
    this.cdr.detectChanges();
  }

  async submitAddVisitor(): Promise<void> {
    if (this.addVisitorForm.invalid) {
      this.addVisitorForm.markAllAsTouched();
      this.logFormErrors(); // Debug form errors
      swalHelper.showToast('Please fill all required fields correctly', 'error');
      return;
    }

    this.modalLoading = true;
    try {
      const formValue = this.addVisitorForm.value;
      console.log('Form Value:', formValue); // Debug form value
      const response = await this.visitorService.createVisitor(formValue);
      console.log('Submit Visitor Response:', response); // Debug response

      if (response.success) {
        swalHelper.showToast(response.message || 'Visitor added successfully', 'success');
        this.closeAddVisitorModal();
        await this.fetchVisitors();
      } else {
        swalHelper.showToast(response.message || 'Failed to add visitor', 'error');
      }
    } catch (error: any) {
      console.error('Error adding visitor:', error);
      swalHelper.showToast(error.message || 'Failed to add visitor', 'error');
    } finally {
      this.modalLoading = false;
      this.cdr.detectChanges();
    }
  }

  private logFormErrors(): void {
    Object.keys(this.addVisitorForm.controls).forEach((key) => {
      const controlErrors = this.addVisitorForm.get(key)?.errors;
      if (controlErrors) {
        console.log(`Field: ${key}, Errors:`, controlErrors);
      }
    });
  }

  onFilterChange(): void {
    this.filters.page = 1;
    this.filterSubject.next();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.filterSubject.next();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      chapterName: null,
      startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
      endDate: this.formatDateForInput(new Date()),
    };
    this.filterSubject.next();
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

  async toggleVisitorPaidStatus(visitor: Visitor): Promise<void> {
    this.updatingVisitorId = visitor._id;
    try {
      const result = await this.visitorService.updateVisitor(visitor._id, { paid: !visitor.paid });
      if (result.success) {
        visitor.paid = !visitor.paid;
        swalHelper.showToast(`Visitor status changed to ${visitor.paid ? 'Paid' : 'Unpaid'}`, 'success');
      }
    } catch (error) {
      console.error('Error updating visitor status:', error);
      swalHelper.showToast('Error updating visitor status', 'error');
    } finally {
      this.updatingVisitorId = null;
      this.cdr.detectChanges();
    }
  }

  async toggleVisitorAttendanceStatus(visitor: Visitor): Promise<void> {
    this.toggling[visitor._id] = true;
    try {
      const response = await this.visitorService.toggleVisitorAttendance({ visitorId: visitor._id });
      if (response.success) {
        visitor.attendanceStatus = response.data.visitor.attendanceStatus;
        swalHelper.showToast(`Visitor attendance status changed to ${visitor.attendanceStatus}`, 'success');
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error toggling attendance status:', error);
      swalHelper.showToast('Failed to toggle attendance status', 'error');
    } finally {
      this.toggling[visitor._id] = false;
      this.cdr.detectChanges();
    }
  }

  async exportToExcel(): Promise<void> {
    try {
      this.exporting = true;
      const exportParams = {
        chapter_name: this.filters.chapterName || undefined,
        startDate: this.filters.startDate || undefined,
        endDate: this.filters.endDate || undefined,
        limit: 10000,
        page: 1,
      };
      const allData = await this.visitorService.getAllVisitors(exportParams);
      const exportData = allData.docs.map((visitor, index) => {
        return {
          'Sr No': index + 1,
          Title: visitor.eventId?.name || 'N/A',
          'Visitor Name': visitor.name || 'N/A',
          Chapter: visitor.refUserId?.chapter_name || 'N/A',
          'Company Name': visitor.business_name || 'N/A',
          'Mobile No': visitor.mobile_number || 'N/A',
          Email: visitor.email || 'N/A',
          'Visitor Address': visitor.address || 'N/A',
          PinCode: visitor.pincode || 'N/A',
          'Visitor Date': visitor.eventId?.date ? this.formatDate(visitor.eventId.date) : 'N/A',
          Profession: visitor.business_type || 'N/A',
          'Visitor Type': visitor.paid ? 'Paid' : 'Unpaid',
          'Attendance Status': visitor.attendanceStatus ? visitor.attendanceStatus : 'N/A',
          Fees: visitor.fees || 'N/A',
        };
      });
      const fileName = `Visitors_Report_${this.formatDateForFileName(new Date())}`;
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
        chapter_name: this.filters.chapterName || undefined,
        startDate: this.filters.startDate || undefined,
        endDate: this.filters.endDate || undefined,
        limit: 10000,
        page: 1,
      };
      const allData = await this.visitorService.getAllVisitors(exportParams);
      const fileName = `Visitors_Report_${this.formatDateForFileName(new Date())}`;
      const columns = [
        { header: 'Sr No', dataKey: 'srNo' },
        { header: 'Title', dataKey: 'title' },
        { header: 'Visitor Name', dataKey: 'visitorName' },
        { header: 'Company Name', dataKey: 'companyName' },
        { header: 'Mobile No', dataKey: 'mobileNo' },
        { header: 'Address', dataKey: 'address' },
        { header: 'PinCode', dataKey: 'pincode' },
        { header: 'Visitor Date', dataKey: 'visitorDate' },
        { header: 'Profession', dataKey: 'profession' },
        { header: 'Visitor Type', dataKey: 'visitorType' },
        { header: 'Attendance Status', dataKey: 'attendanceStatus' },
      ];
      const data = allData.docs.map((visitor, index) => {
        return {
          srNo: index + 1,
          title: visitor.eventId?.name || 'N/A',
          visitorName: `${visitor.name || 'N/A'}\n(${visitor.refUserId?.chapter_name || 'N/A'})`,
          companyName: visitor.business_name || 'N/A',
          mobileNo: visitor.mobile_number || 'N/A',
          address: visitor.address || 'N/A',
          pincode: visitor.pincode || 'N/A',
          visitorDate: visitor.eventId?.date ? this.formatDate(visitor.eventId.date) : 'N/A',
          profession: visitor.business_type || 'N/A',
          visitorType: visitor.paid ? 'Paid' : 'Unpaid',
          attendanceStatus: visitor.attendanceStatus ? visitor.attendanceStatus : 'N/A',
        };
      });
      const title = 'Visitors Report';
      let subtitle = 'All Visitors';
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