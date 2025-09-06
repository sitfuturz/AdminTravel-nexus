import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { MemberApplicationService, MemberApplication, MemberApplicationResponse } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

@Component({
  selector: 'app-registration-form',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [MemberApplicationService],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegistrationFormComponent1 implements OnInit {
  applications: MemberApplicationResponse = {
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
    limit: 10
  };

  private searchSubject = new Subject<string>();

  constructor(
    private memberApplicationService: MemberApplicationService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.fetchApplications();
    });
  }

  ngOnInit(): void {
    this.fetchApplications();
  }

  async fetchApplications(): Promise<void> {
    this.loading = true;

    try {
      const requestData = {
        page: this.payload.page,
        limit: this.payload.limit,
        ...(this.searchQuery && { search: this.searchQuery })
      };

      const response = await this.memberApplicationService.getAllApplications1(requestData);
      this.applications = response;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching applications:', error);
      swalHelper.showToast('Failed to fetch registration forms', 'error');
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
    this.fetchApplications();
  }

  onPageChange(page: number): void {
    this.payload.page = page;
    this.fetchApplications();
  }

  exportData(): void {
    const headers = ['Name', 'Mobile Number', 'Invited By'];

    const data = this.applications.docs.map(app => [
      `${app.applicant.firstName} ${app.applicant.lastName}`,
      app.applicant.mobileNumber,
      `${app.invitedBy} `
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'registration_forms.csv');
    link.click();
    URL.revokeObjectURL(url);
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Registration Forms', 14, 22);

    // Define table data with serial number
    const tableData = this.applications.docs.map((app, index) => [
      (index + 1).toString(), // Serial number starting from 1
      `${app.applicant.firstName} ${app.applicant.lastName}`,
      app.applicant.mobileNumber,
      app.invitedBy || ''
    ]);

    // Add table using jspdf-autotable
    (doc as any).autoTable({
      head: [['S.No.', 'Name', 'Mobile Number', 'Invited By']],
      body: tableData,
      startY: 30,
      theme: 'striped',
      headStyles: { fillColor: [22, 160, 133] },
      margin: { top: 30 },
      columnStyles: {
        0: { cellWidth: 20 } // Set fixed width for S.No. column
      }
    });

    // Save the PDF
    doc.save('registration_forms.pdf');
  }
}