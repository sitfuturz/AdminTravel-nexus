import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  EventService, 
  Event, 
  ParticipationService, 
  Participant, 
  ParticipantResponse,
  ChapterService, 
  Chapter 
} from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExportService } from '../../../services/export.service';
import { environment } from 'src/env/env.local';

declare var bootstrap: any;

@Component({
  selector: 'app-participation',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, NgSelectModule],
  providers: [EventService, ParticipationService, ChapterService, ExportService],
  templateUrl: './participation.component.html',
  styleUrls: ['./participation.component.css'],
})
export class ParticipationComponent implements OnInit {
  events: Event[] = [];
  filteredEvents: Event[] = [];
  participants: Participant[] = [];
  chapters: Chapter[] = [];
  selectedEvent: Event | null = null;
  
  loading: boolean = false;
  loadingParticipants: boolean = false;
  chaptersLoading: boolean = false;
  exporting: boolean = false;
  
  Math = Math;
  currentPage: number = 1;
  
  filters = {
    limit: 10,
    chapter_name: null,
    startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
    endDate: this.formatDateForInput(new Date())
  };
  
  paginationConfig = {
    id: 'participation-pagination'
  };
  
  private filterSubject = new Subject<void>();
  
  constructor(
    private eventService: EventService,
    private participationService: ParticipationService,
    private chapterService: ChapterService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.applyFilters();
    });
  }

  ngOnInit(): void {
    this.fetchChapters();
    this.fetchEvents();
  }

  async fetchEvents(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.eventService.getAllEvents();
      this.events = response || [];
      this.applyFilters();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching events:', error);
      swalHelper.showToast('Failed to fetch events', 'error');
      this.events = [];
      this.filteredEvents = [];
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

  applyFilters(): void {
    let filtered = [...this.events];

    // Filter by chapter
    if (this.filters.chapter_name) {
      filtered = filtered.filter(event => 
        event.chapter_name === this.filters.chapter_name
      );
    }

    // Filter by date range
    if (this.filters.startDate) {
      const startDate = new Date(this.filters.startDate);
      filtered = filtered.filter(event => 
        new Date(event.date) >= startDate
      );
    }

    if (this.filters.endDate) {
      const endDate = new Date(this.filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(event => 
        new Date(event.date) <= endDate
      );
    }

    this.filteredEvents = filtered;
    // Reset to first page when filters change
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.filterSubject.next();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  resetFilters(): void {
    this.filters = {
      limit: 10,
      chapter_name: null,
      startDate: this.formatDateForInput(new Date(new Date().setDate(new Date().getDate() - 30))),
      endDate: this.formatDateForInput(new Date())
    };
    this.currentPage = 1;
    this.applyFilters();
  }

  async viewParticipation(event: Event): Promise<void> {
    this.selectedEvent = event;
    this.loadingParticipants = true;
    this.participants = [];

    try {
      const response: ParticipantResponse = await this.participationService.getAllParticipants(event._id);
      this.participants = response.data.docs || [];
      
      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('participationModal'));
      modal.show();
      
    } catch (error) {
      console.error('Error fetching participants:', error);
      swalHelper.showToast('Failed to fetch participants', 'error');
    } finally {
      this.loadingParticipants = false;
      this.cdr.detectChanges();
    }
  }

  getParticipantsByPreference(preference: string): number {
    return this.participants.filter(p => p.preference.toLowerCase() === preference.toLowerCase()).length;
  }

  getProfilePicUrl(picPath?: string): string {
    if (!picPath) return 'assets/images/default-avatar.png';
    return `${environment.imageUrl}/${picPath}`;
  }

  formatDate(dateString?: string): string {
    if (!dateString || isNaN(new Date(dateString).getTime())) return 'N/A';
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
      
      const exportData = this.filteredEvents.map((event, index) => {
        return {
          'Sr No': index + 1,
          'Event Name': event.name || 'Unknown Event',
          'Chapter Name': event.chapter_name || 'N/A',
          'Event Date': this.formatDate(event.date),
          'Mode': event.mode ? event.mode.charAt(0).toUpperCase() + event.mode.slice(1) : 'N/A',
          'Location': event.location || 'N/A',
          'Event Type': event.event_or_meeting === 'event' ? 'Event' : 'Meeting',
          'Paid': event.paid ? 'Yes' : 'No',
          'Start Time': event.startTime || 'N/A',
          'End Time': event.endTime || 'N/A'
        };
      });
      
      const fileName = `Event_Participation_${this.formatDateForFileName(new Date())}`;
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
      
      const fileName = `Event_Participation_${this.formatDateForFileName(new Date())}`;
      const columns = [
        { header: 'Sr No', dataKey: 'srNo' },
        { header: 'Event Name', dataKey: 'eventName' },
        { header: 'Chapter', dataKey: 'chapter' },
        { header: 'Date', dataKey: 'date' },
        { header: 'Mode', dataKey: 'mode' },
        { header: 'Location', dataKey: 'location' }
      ];
      
      const data = this.filteredEvents.map((event, index) => {
        return {
          srNo: index + 1,
          eventName: event.name || 'Unknown Event',
          chapter: event.chapter_name || 'N/A',
          date: this.formatDate(event.date),
          mode: event.mode ? event.mode.charAt(0).toUpperCase() + event.mode.slice(1) : 'N/A',
          location: event.location || 'N/A'
        };
      });
      
      const title = 'Event Participation Report';
      let subtitle = 'All Events';
      if (this.filters.chapter_name) {
        subtitle = `Chapter: ${this.filters.chapter_name}`;
      }
      if (this.filters.startDate && this.filters.endDate) {
        subtitle += ` | Period: ${this.formatDate(this.filters.startDate)} to ${this.formatDate(this.filters.endDate)}`;
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

  async exportParticipantsToExcel(): Promise<void> {
    if (!this.selectedEvent || !this.participants || this.participants.length === 0) {
      swalHelper.showToast('No participants to export', 'warning');
      return;
    }

    try {
      const exportData = this.participants.map((participant, index) => {
        return {
          'Sr No': index + 1,
          'Participant Name': participant.userId?.name || 'Unknown',
          'Chapter': participant.userId?.chapter_name || 'N/A',
          'Preference': participant.preference || 'N/A',
          'Registration Date': this.formatDate(participant.createdAt),
          'Event Name': this.selectedEvent?.name || 'Unknown Event',
          'Event Date': this.formatDate(this.selectedEvent?.date)
        };
      });
      
      const fileName = `${this.selectedEvent.name}_Participants_${this.formatDateForFileName(new Date())}`;
      await this.exportService.exportToExcel(exportData, fileName);
      swalHelper.showToast('Participants exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting participants:', error);
      swalHelper.showToast('Failed to export participants', 'error');
    }
  }

  private formatDateForFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}