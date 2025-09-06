import { Component, OnInit, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { EventRegistrationService, EventRegistration, EventRegistrationResponse } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { environment } from 'src/env/env.local';

declare var bootstrap: any;

@Component({
  selector: 'app-event-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [EventRegistrationService],
  templateUrl: './eventRegistration.component.html',
  styleUrls: ['./eventRegistration.component.css'],
})
export class EventRegistrationComponent implements OnInit, AfterViewInit {
  registrations: EventRegistrationResponse = {
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
  payload = {
    page: 1,
    limit: 10,
    userType: null as string | null,
    chapter: null as string | null
  };
  previewUrl: string = '';
  isPdf: boolean = false;
  imageUrl: string = environment.imageUrl;
  previewModal: any;

  userTypes = [
    { name: 'Member', value: 'Member' },
    { name: 'Visitor', value: 'Visitor' }
  ];
  chapters = ['Achiever', 'Believers', 'Creators', 'Dreamer', 'Elevator'];

  private searchSubject = new Subject<string>();

  constructor(
    private eventRegistrationService: EventRegistrationService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.fetchRegistrations();
    });
  }

  ngOnInit(): void {
    this.fetchRegistrations();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('previewModal');
      if (modalElement) {
        this.previewModal = new bootstrap.Modal(modalElement);
      } else {
        console.warn('Preview modal element not found in the DOM');
      }
    }, 300);
  }

  async fetchRegistrations(): Promise<void> {
    this.loading = true;

    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        ...(this.searchQuery && { search: this.searchQuery }),
        ...(this.payload.userType && { userType: this.payload.userType }),
        ...(this.payload.userType === 'Member' && this.payload.chapter && { chapter: this.payload.chapter })
      };

      const response = await this.eventRegistrationService.getAllEventRegistrations(requestData);
      this.registrations = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching registrations:', error);
      swalHelper.showToast('Failed to fetch event registrations', 'error');
    } finally {
      this.loading = false;
    }
  }

  onSearch(): void {
    this.payload.page = 1;
    this.searchSubject.next(this.searchQuery);
  }

  onChange(): void {
    this.payload.page = 1;
    this.fetchRegistrations();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchRegistrations();
  }

  onUserTypeChange(): void {
    if (this.payload.userType !== 'Member') {
      this.payload.chapter = null;
    }
    this.payload.page = 1;
    this.fetchRegistrations();
  }

  onFilterChange(): void {
    this.payload.page = 1;
    this.fetchRegistrations();
  }

  getImageUrl(path: string): string {
    return `${this.imageUrl}${path}`;
  }

  openPreview(path: string): void {
    this.previewUrl = this.getImageUrl(path);
    this.isPdf = path.toLowerCase().endsWith('.pdf');
    if (this.previewModal) {
      this.previewModal.show();
    }
  }

  exportToExcel(): void {
    const headers = ['S.No.', 'Name', 'User Type', 'Chapter', 'Mobile Number', 'Invited By', 'Payment Status', 'Registration Date '];

    const data = this.registrations.docs.map((reg, index) => ({
      'S.No.': index + 1,
      Name: reg.name,
      'User Type': reg.userType,
      Chapter: reg.chapter || 'N/A',
      'Mobile Number': reg.mobileNumber,
      'Invited By': reg.invitedBy,
      'Payment Status': reg.paymentStatus,
      'Registration Date': new Date(reg.registrationDate).toLocaleString()
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'EventRegistrations');
    XLSX.writeFile(wb, 'event_registrations.xlsx');
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Event Registrations', 14, 22);

    const tableData = this.registrations.docs.map((reg, index) => [
      (index + 1).toString(),
      reg.name,
      reg.userType,
      reg.chapter || 'N/A',
      reg.mobileNumber,
      reg.invitedBy,
      reg.paymentStatus,
      new Date(reg.registrationDate).toLocaleString()
    ]);

    (doc as any).autoTable({
      head: [['S.No.', 'Name', 'User Type', 'Chapter', 'Mobile Number', 'Invited By', 'Payment Status', 'Registration Date']],
      body: tableData,
      startY: 30,
      theme: 'striped',
      headStyles: { fillColor: [22, 160, 133] },
      margin: { top: 30 },
      columnStyles: {
        0: { cellWidth: 15 }
      }
    });

    doc.save('event_registrations.pdf');
  }


  async copyToClipboard(text: string){
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      await swalHelper.showToast("Copied", "success");
    }
  }
}