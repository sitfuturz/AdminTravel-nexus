import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService, Attendance } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [AttendanceService],
  templateUrl: './attendence.component.html',
  styleUrls: ['./attendence.component.css'],
})
export class AttendanceComponent implements OnInit {
  attendanceRecords: Attendance[] = [];
  filteredRecords: Attendance[] = [];
  loading: boolean = false;
  searchQuery: string = '';
  
  private searchSubject = new Subject<string>();

  constructor(
    private attendanceService: AttendanceService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(
      debounceTime(300)
    ).subscribe(() => {
      this.filterRecords();
    });
  }

  ngOnInit(): void {
    this.fetchAttendanceRecords();
  }

  async fetchAttendanceRecords(): Promise<void> {
    this.loading = true;
    
    try {
      const response = await this.attendanceService.getAllAttendance();
      if (response ) {
        this.attendanceRecords = response.docs;
        this.filteredRecords = [...this.attendanceRecords];
        this.cdr.detectChanges();
      } else {
        swalHelper.showToast('Failed to fetch attendance records', 'error');
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      swalHelper.showToast('Failed to fetch attendance records', 'error');
    } finally {
      this.loading = false;
    }
  }

  onSearch(): void {
    this.searchSubject.next(this.searchQuery);
  }

  filterRecords(): void {
    if (!this.searchQuery.trim()) {
      this.filteredRecords = [...this.attendanceRecords];
      return;
    }

    const searchTerm = this.searchQuery.toLowerCase().trim();
    this.filteredRecords = this.attendanceRecords.filter(record => {
      return (
        record.userData.name.toLowerCase().includes(searchTerm) ||
        record.userData.chapter_name.toLowerCase().includes(searchTerm) ||
        record.eventData.name.toLowerCase().includes(searchTerm) ||
        record.eventData.event_or_meeting.toLowerCase().includes(searchTerm) ||
        this.formatDate(record.eventData.date).toLowerCase().includes(searchTerm)
      );
    });
  }

  async confirmDeleteAttendance(attendanceId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Attendance Record',
        'Are you sure you want to delete this attendance record? This action cannot be undone.',
        'warning'
      );
      
      if (result.isConfirmed) {
        await this.deleteAttendance(attendanceId);
      }
    } catch (error) {
      console.error('Confirmation dialog error:', error);
    }
  }

  async deleteAttendance(attendanceId: string): Promise<void> {
    try {
      this.loading = true;
      
      const response = await this.attendanceService.deleteAttendance(attendanceId);
      
      if (response && response.success) {
        swalHelper.showToast('Attendance record deleted successfully', 'success');
        // Remove the deleted record from the arrays
        this.attendanceRecords = this.attendanceRecords.filter(record => record._id !== attendanceId);
        this.filterRecords(); // Re-apply filter to update filteredRecords
      } else {
        swalHelper.showToast(response.message || 'Failed to delete attendance record', 'error');
      }
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      swalHelper.showToast('Failed to delete attendance record', 'error');
    } finally {
      this.loading = false;
    }
  }

  // Format date helper
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}