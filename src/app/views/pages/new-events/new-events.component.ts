import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxPaginationModule } from 'ngx-pagination';

import { AuthService, EventService } from '../../../services/auth.service';
import { swalHelper } from '../../../core/constants/swal-helper';
import { debounceTime, Subject } from 'rxjs';
import { environment } from 'src/env/env.local';

declare var $: any;
declare var bootstrap: any;

// Interface for Event data
interface Event {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  venue: string;
  mapUrl: string;
  eventType: string;
  capacity: number;
  ticketPrice: number;
  bannerImage: string;
  registrationLink: string;
  isActive: boolean;
  sponsors: any[];
  schedules: any[];
  speakers: any[];
  createdAt: string;
  updatedAt?: string;
}

// Interface for API Response
interface EventResponse {
  success: boolean;
  message: string;
  events: Event[];
  total: number;
  page: number;
  limit: number;
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, NgxPaginationModule],
  providers: [],
  templateUrl: './new-events.component.html',
  styleUrl: './new-events.component.scss'
})
export class NewEventsComponent implements OnInit, AfterViewInit {
  eventForm: any = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    location: '',
    venue: '',
    mapUrl: '',
    eventType: 'offline',
    capacity: null,
    ticketPrice: 0,
    sponsors: [],
    schedules: [],
    speakers: [],
    bannerImage: null
  };

  editEventForm: any = {};
  selectedEvent: Event | null = null;
  
  // Event list data
  events: EventResponse = {
    success: false,
    message: '',
    events: [],
    total: 0,
    page: 1,
    limit: 10
  };

  loading: boolean = false;
  eventsLoading: boolean = false;
  editLoading: boolean = false;
  
  // Search and pagination
  searchQuery: string = '';
  selectedStatus: string = '';
  payload: {
    search: string;
    page: number;
    limit: number;
    isActive: string | undefined;
  } = {
    search: '',
    page: 1,
    limit: 10,
    isActive: undefined
  };

  paginationConfig = {
    id: 'events-pagination'
  };

  // Track which fields have been touched/interacted with
  touchedFields: any = {
    title: false,
    description: false,
    startDate: false,
    endDate: false,
    startTime: false,
    endTime: false,
    location: false,
    venue: false,
    eventType: false,
    capacity: false,
    ticketPrice: false
  };

  editTouchedFields: any = {};

  // Validation error messages
  validationErrors: any = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    location: '',
    venue: '',
    eventType: '',
    capacity: '',
    ticketPrice: ''
  };

  editValidationErrors: any = {};

  // Event types
  eventTypes = [
    { label: 'offline', value: 'offline' },
    { label: 'online', value: 'online' },
    { label: 'hybrid', value: 'hybrid' }
  ];

  statusOptions = [
    { label: 'All Events', value: '' },
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' }
  ];

  Math = Math;
  imageurl = environment.imageUrl;
  private searchSubject = new Subject<string>();
  eventModal: any;
  editEventModal: any;
  viewEventModal: any;

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(debounceTime(500)).subscribe(() => {
      this.fetchEvents();
    });
  }

  ngOnInit(): void {
    this.fetchEvents();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const modalElement = document.getElementById('eventModal');
      if (modalElement) {
        this.eventModal = new bootstrap.Modal(modalElement);
      }
      
      const editModalElement = document.getElementById('editEventModal');
      if (editModalElement) {
        this.editEventModal = new bootstrap.Modal(editModalElement);
      }

      const viewModalElement = document.getElementById('viewEventModal');
      if (viewModalElement) {
        this.viewEventModal = new bootstrap.Modal(viewModalElement);
      }
    }, 300);
  }

  async fetchEvents(): Promise<void> {
  this.eventsLoading = true;
  try {
    const requestData = {
      page: this.payload.page,
      limit: this.payload.limit,
      isActive: this.payload.isActive
    };
    
    const response = await this.eventService.newGetEvents(requestData);
    
    if (response && response.success) {
      // Update this part to access response.data instead of response directly
      this.events = {
        success: response.success,
        message: response.message,
        events: response.data.events || [], // Access events from response.data
        total: response.data.total || 0,    // Access total from response.data
        page: response.data.page || 1,      // Access page from response.data
        limit: response.data.limit || 10    // Access limit from response.data
      };
      this.cdr.detectChanges();
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    swalHelper.showToast('Failed to fetch events', 'error');
    this.events = {
      success: false,
      message: 'Error',
      events: [],
      total: 0,
      page: this.payload.page,
      limit: this.payload.limit
    };
  } finally {
    this.eventsLoading = false;
    this.cdr.detectChanges();
  }
}

  onSearch(): void {
    this.payload.page = 1;
    this.payload.search = this.searchQuery;
    this.searchSubject.next(this.searchQuery);
  }

  onStatusChange(): void {
    this.payload.page = 1;
    this.payload.isActive = this.selectedStatus === '' ? undefined : this.selectedStatus;
    this.fetchEvents();
  }

  onChange(): void {
    this.payload.page = 1;
    this.fetchEvents();
  }

  onPageChange(page: number): void {
    if (page !== this.payload.page) {
      this.payload.page = page;
      this.fetchEvents();
    }
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.eventForm.bannerImage = file;
    }
  }

  onEditFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.editEventForm.bannerImage = file;
    }
  }

  // Validation methods
  validateTitle(isEdit: boolean = false): boolean {
    const form = isEdit ? this.editEventForm : this.eventForm;
    const touched = isEdit ? this.editTouchedFields : this.touchedFields;
    const errors = isEdit ? this.editValidationErrors : this.validationErrors;

    if (!touched.title) return true;

    const title = form.title?.trim();
    if (!title) {
      errors.title = 'Event title is required';
      return false;
    }
    if (title.length < 3) {
      errors.title = 'Event title must be at least 3 characters';
      return false;
    }
    errors.title = '';
    return true;
  }

  validateDescription(isEdit: boolean = false): boolean {
    const form = isEdit ? this.editEventForm : this.eventForm;
    const touched = isEdit ? this.editTouchedFields : this.touchedFields;
    const errors = isEdit ? this.editValidationErrors : this.validationErrors;

    if (!touched.description) return true;

    const description = form.description?.trim();
    if (!description) {
      errors.description = 'Event description is required';
      return false;
    }
    if (description.length < 10) {
      errors.description = 'Event description must be at least 10 characters';
      return false;
    }
    errors.description = '';
    return true;
  }

  validateDates(isEdit: boolean = false): boolean {
    const form = isEdit ? this.editEventForm : this.eventForm;
    const touched = isEdit ? this.editTouchedFields : this.touchedFields;
    const errors = isEdit ? this.editValidationErrors : this.validationErrors;

    if (!touched.startDate && !touched.endDate) return true;

    if (!form.startDate) {
      errors.startDate = 'Start date is required';
      return false;
    }

    if (!form.endDate) {
      errors.endDate = 'End date is required';
      return false;
    }

    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);

    if (startDate > endDate) {
      errors.endDate = 'End date must be after start date';
      return false;
    }

    errors.startDate = '';
    errors.endDate = '';
    return true;
  }

  validateLocation(isEdit: boolean = false): boolean {
    const form = isEdit ? this.editEventForm : this.eventForm;
    const touched = isEdit ? this.editTouchedFields : this.touchedFields;
    const errors = isEdit ? this.editValidationErrors : this.validationErrors;

    if (!touched.location) return true;

    const location = form.location?.trim();
    if (!location) {
      errors.location = 'Location is required';
      return false;
    }
    errors.location = '';
    return true;
  }

  validateCapacity(isEdit: boolean = false): boolean {
    const form = isEdit ? this.editEventForm : this.eventForm;
    const touched = isEdit ? this.editTouchedFields : this.touchedFields;
    const errors = isEdit ? this.editValidationErrors : this.validationErrors;

    if (!touched.capacity) return true;

    if (form.capacity && form.capacity <= 0) {
      errors.capacity = 'Capacity must be greater than 0';
      return false;
    }
    errors.capacity = '';
    return true;
  }

  onFieldBlur(fieldName: string, isEdit: boolean = false): void {
    const touched = isEdit ? this.editTouchedFields : this.touchedFields;
    touched[fieldName] = true;
    
    switch (fieldName) {
      case 'title':
        this.validateTitle(isEdit);
        break;
      case 'description':
        this.validateDescription(isEdit);
        break;
      case 'startDate':
      case 'endDate':
        this.validateDates(isEdit);
        break;
      case 'location':
        this.validateLocation(isEdit);
        break;
      case 'capacity':
        this.validateCapacity(isEdit);
        break;
    }
  }

  async createEvent(): Promise<void> {
    try {
      this.markAllFieldsAsTouched();
      
      if (!this.validateFormForSubmission()) {
        swalHelper.showToast('Please fix all validation errors', 'warning');
        return;
      }

      this.loading = true;
      const formData = new FormData();
      
      Object.keys(this.eventForm).forEach(key => {
        if (key === 'bannerImage' && this.eventForm[key]) {
          formData.append(key, this.eventForm[key]);
        } else if (key === 'sponsors' || key === 'schedules' || key === 'speakers') {
          formData.append(key, JSON.stringify(this.eventForm[key]));
        } else if (this.eventForm[key] !== null && this.eventForm[key] !== '') {
          formData.append(key, this.eventForm[key]);
        }
      });

      const response = await this.eventService.newCreateEvent(formData);
      
      if (response && response.success) {
        swalHelper.showToast('Event created successfully', 'success');
        this.closeModal();
        this.resetForm();
        this.fetchEvents();
      } else {
        swalHelper.showToast(response.message || 'Failed to create event', 'error');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      swalHelper.showToast('Failed to create event', 'error');
    } finally {
      this.loading = false;
    }
  }

  async updateEvent(): Promise<void> {
    try {
      this.markAllEditFieldsAsTouched();
      
      if (!this.validateEditFormForSubmission()) {
        swalHelper.showToast('Please fix all validation errors', 'warning');
        return;
      }

      this.editLoading = true;
      const formData = new FormData();
      
      formData.append('id', this.selectedEvent!._id);
      
      Object.keys(this.editEventForm).forEach(key => {
        if (key === 'bannerImage' && this.editEventForm[key] instanceof File) {
          formData.append(key, this.editEventForm[key]);
        } else if (key === 'sponsors' || key === 'schedules' || key === 'speakers') {
          formData.append(key, JSON.stringify(this.editEventForm[key]));
        } else if (this.editEventForm[key] !== null && this.editEventForm[key] !== '') {
          formData.append(key, this.editEventForm[key]);
        }
      });

      const response = await this.eventService.newUpdateEvent(formData);
      
      if (response && response.success) {
        swalHelper.showToast('Event updated successfully', 'success');
        this.closeEditModal();
        this.fetchEvents();
      } else {
        swalHelper.showToast(response.message || 'Failed to update event', 'error');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      swalHelper.showToast('Failed to update event', 'error');
    } finally {
      this.editLoading = false;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      const result = await swalHelper.confirmation(
        'Delete Event',
        'Are you sure you want to delete this event? This action cannot be undone.',
        'warning'
      );

      if (result.isConfirmed) {
        this.loading = true;
        const response = await this.eventService.newDeleteEvent({ id: eventId });
        
        if (response && response.success) {
          swalHelper.showToast('Event deleted successfully', 'success');
          this.fetchEvents();
        } else {
          swalHelper.showToast(response.message || 'Failed to delete event', 'error');
        }
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      swalHelper.showToast('Failed to delete event', 'error');
    } finally {
      this.loading = false;
    }
  }

  markAllFieldsAsTouched(): void {
    Object.keys(this.touchedFields).forEach(key => {
      this.touchedFields[key] = true;
    });
  }

  markAllEditFieldsAsTouched(): void {
    Object.keys(this.editTouchedFields).forEach(key => {
      this.editTouchedFields[key] = true;
    });
  }

  validateFormForSubmission(): boolean {
    let isValid = true;
    
    if (!this.eventForm.title?.trim()) {
      this.validationErrors.title = 'Event title is required';
      isValid = false;
    }
    
    if (!this.eventForm.description?.trim()) {
      this.validationErrors.description = 'Event description is required';
      isValid = false;
    }
    
    if (!this.eventForm.startDate) {
      this.validationErrors.startDate = 'Start date is required';
      isValid = false;
    }
    
    if (!this.eventForm.endDate) {
      this.validationErrors.endDate = 'End date is required';
      isValid = false;
    }
    
    if (!this.eventForm.location?.trim()) {
      this.validationErrors.location = 'Location is required';
      isValid = false;
    }

    return isValid;
  }

  validateEditFormForSubmission(): boolean {
    let isValid = true;
    
    if (!this.editEventForm.title?.trim()) {
      this.editValidationErrors.title = 'Event title is required';
      isValid = false;
    }
    
    if (!this.editEventForm.description?.trim()) {
      this.editValidationErrors.description = 'Event description is required';
      isValid = false;
    }
    
    if (!this.editEventForm.startDate) {
      this.editValidationErrors.startDate = 'Start date is required';
      isValid = false;
    }
    
    if (!this.editEventForm.endDate) {
      this.editValidationErrors.endDate = 'End date is required';
      isValid = false;
    }
    
    if (!this.editEventForm.location?.trim()) {
      this.editValidationErrors.location = 'Location is required';
      isValid = false;
    }

    return isValid;
  }

  validateForm(): boolean {
    return this.eventForm.title?.trim() &&
           this.eventForm.description?.trim() &&
           this.eventForm.startDate &&
           this.eventForm.endDate &&
           this.eventForm.location?.trim();
  }

  resetForm(): void {
    this.eventForm = {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      location: '',
      venue: '',
      mapUrl: '',
      eventType: 'offline',
      capacity: null,
      ticketPrice: 0,
      sponsors: [],
      schedules: [],
      speakers: [],
      bannerImage: null
    };

    this.validationErrors = {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      location: '',
      venue: '',
      eventType: '',
      capacity: '',
      ticketPrice: ''
    };

    this.touchedFields = {
      title: false,
      description: false,
      startDate: false,
      endDate: false,
      startTime: false,
      endTime: false,
      location: false,
      venue: false,
      eventType: false,
      capacity: false,
      ticketPrice: false
    };
  }

  viewEvent(event: Event): void {
    this.selectedEvent = event;
    this.showViewModal();
  }

  editEvent(event: Event): void {
    this.selectedEvent = event;
    this.editEventForm = {
      title: event.title || '',
      description: event.description || '',
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      location: event.location || '',
      venue: event.venue || '',
      mapUrl: event.mapUrl || '',
      eventType: event.eventType || 'offline',
      capacity: event.capacity || null,
      ticketPrice: event.ticketPrice || 0,
      sponsors: event.sponsors || [],
      schedules: event.schedules || [],
      speakers: event.speakers || []
    };

    this.editValidationErrors = {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      location: '',
      venue: '',
      eventType: '',
      capacity: '',
      ticketPrice: ''
    };

    this.editTouchedFields = {
      title: false,
      description: false,
      startDate: false,
      endDate: false,
      startTime: false,
      endTime: false,
      location: false,
      venue: false,
      eventType: false,
      capacity: false,
      ticketPrice: false
    };

    this.showEditModal();
  }

  showModal(): void {
    if (this.eventModal) {
      this.eventModal.show();
    } else {
      $('#eventModal').modal('show');
    }
  }

  showEditModal(): void {
    if (this.editEventModal) {
      this.editEventModal.show();
    } else {
      $('#editEventModal').modal('show');
    }
  }

  showViewModal(): void {
    if (this.viewEventModal) {
      this.viewEventModal.show();
    } else {
      $('#viewEventModal').modal('show');
    }
  }

  closeModal(): void {
    if (this.eventModal) {
      this.eventModal.hide();
    } else {
      $('#eventModal').modal('hide');
    }
  }

  closeEditModal(): void {
    if (this.editEventModal) {
      this.editEventModal.hide();
    } else {
      $('#editEventModal').modal('hide');
    }
  }

  closeViewModal(): void {
    if (this.viewEventModal) {
      this.viewEventModal.hide();
    } else {
      $('#viewEventModal').modal('hide');
    }
  }

  openEventModal(): void {
    this.resetForm();
    setTimeout(() => {
      this.showModal();
    }, 100);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  formatDateTime(dateString: string, timeString?: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString).toLocaleDateString();
    return timeString ? `${date} ${timeString}` : date;
  }
}