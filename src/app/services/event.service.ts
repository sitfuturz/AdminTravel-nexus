// import { Injectable } from "@angular/core";
// import { apiEndpoints } from "../core/constants/api-endpoints";
// import { common } from "../core/constants/common";
// import { swalHelper } from "../core/constants/swal-helper";
// import { ApiManager } from "../core/utilities/api-manager";
// import { AppStorage } from "../core/utilities/app-storage";

// export interface Event {
//   _id: string;
//   title: string;
//   description: string;
//   startDate: string;
//   endDate: string;
//   startTime: string;
//   endTime: string;
//   location: string;
//   venue: string;
//   mapUrl: string;
//   eventType: string;
//   capacity: number;
//   ticketPrice: number;
//   sponsors: Array<{ name: string; logo: string; website: string; tier: string; description: string; contactEmail: string }>;
//   schedules: Array<{ title: string; description: string; startTime: string; endTime: string; location: string }>;
//   speakers: Array<{ name: string; bio: string; photo: string; email: string; socialLinks: { linkedin: string } }>;
//   maxRegistrations: number;
//   registrationDeadline: string;
//   bannerImage: string;
//   photos: Array<{ path: string; caption: string }>;
//   videos: Array<{ path: string; caption: string }>;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface EventRegistration {
//   _id: string;
//   eventId: string;
//   user: {
//     _id: string;
//     name: string;
//     email: string;
//   };
//   ticketType: string;
//   registeredAt: string;
// }

// export interface EventListResponse {
//   success: boolean;
//   data: {
//     docs: Event[];
//     totalDocs: number;
//     limit: number;
//     page: number;
//     totalPages: number;
//     pagingCounter: number;
//     hasPrevPage: boolean;
//     hasNextPage: boolean;
//     prevPage: number | null;
//     nextPage: number | null;
//   };
//   message?: string;
// }

// export interface EventRegistrationsResponse {
//   success: boolean;
//   data: {
//     docs: EventRegistration[];
//     totalDocs: number;
//     limit: number;
//     page: number;
//     totalPages: number;
//     pagingCounter: number;
//     hasPrevPage: boolean;
//     hasNextPage: boolean;
//     prevPage: number | null;
//     nextPage: number | null;
//   };
//   message?: string;
// }

// @Injectable({
//   providedIn: 'root',
// })
// export class EventService {
//   private headers: any = [];

//   constructor(private apiManager: ApiManager, private storage: AppStorage) {}

//   private getHeaders = () => {
//     this.headers = [];
//     let token = this.storage.get(common.TOKEN);

//     if (token != null) {
//       this.headers.push({ Authorization: `Bearer ${token}` });
//     }
//   };

//   // Updated to use new list events API with POST method
//   async getAllEvents(data: { page?: number; limit?: number; isActive?: string; search?: string } = {}): Promise<Event[]> {
//     try {
//       this.getHeaders();
      
//       const payload = {
//         page: data.page || 1,
//         limit: data.limit || 10,
//         isActive: data.isActive || "true"
//       };

//       const response = await this.apiManager.request(
//         {
//           url: apiEndpoints.LIST_EVENTS, // /admin/event/list
//           method: 'POST',
//         },
//         payload,
//         this.headers
//       );

//       return response.data.docs || [];
//     } catch (error) {
//       console.error('Error fetching events:', error);
//       swalHelper.showToast('Failed to fetch events', 'error');
//       throw error;
//     }
//   }

//   // Updated to use new get event API with POST method
//   async getEventById(id: string): Promise<any> {
//     try {
//       this.getHeaders();

//       const payload = {
//         id: id
//       };

//       const response = await this.apiManager.request(
//         {
//           url: apiEndpoints.GET_EVENT_BY_ID, // /admin/event/get
//           method: 'POST',
//         },
//         payload,
//         this.headers
//       );

//       return response;
//     } catch (error) {
//       console.error('Error fetching event by ID:', error);
//       swalHelper.showToast('Failed to fetch event details', 'error');
//       throw error;
//     }
//   }

//   // Updated to use new create event API
//   async createEvent(formData: FormData): Promise<any> {
//     try {
//       this.getHeaders();

//       const response = await this.apiManager.request(
//         {
//           url: apiEndpoints.CREATE_EVENT, // /admin/event/create
//           method: 'POST',
//         },
//         formData,
//         this.headers
//       );

//       return response;
//     } catch (error) {
//       console.error('Error creating event:', error);
//       swalHelper.showToast('Failed to create event', 'error');
//       throw error;
//     }
//   }

//   // Updated to use new update event API
//   async updateEvent(formData: FormData): Promise<any> {
//     try {
//       this.getHeaders();

//       const response = await this.apiManager.request(
//         {
//           url: apiEndpoints.UPDATE_EVENT, // /event/update
//           method: 'POST',
//         },
//         formData,
//         this.headers
//       );

//       return response;
//     } catch (error) {
//       console.error('Error updating event:', error);
//       swalHelper.showToast('Failed to update event', 'error');
//       throw error;
//     }
//   }

//   // Updated to use new delete event API
//   async deleteEvent(payload: { id: string }): Promise<any> {
//     try {
//       this.getHeaders();

//       const response = await this.apiManager.request(
//         {
//           url: apiEndpoints.DELETE_EVENT, // /event/delete
//           method: 'POST',
//         },
//         payload,
//         this.headers
//       );

//       return response;
//     } catch (error) {
//       console.error('Error deleting event:', error);
//       swalHelper.showToast('Failed to delete event', 'error');
//       throw error;
//     }
//   }

//   // Updated to use new gallery upload API
//   async uploadGalleryItem(formData: FormData): Promise<any> {
//     try {
//       this.getHeaders();

//       const response = await this.apiManager.request(
//         {
//           url: apiEndpoints.UPLOAD_GALLERY_ITEM, // /event/gallery
//           method: 'POST',
//         },
//         formData,
//         this.headers
//       );

//       return response;
//     } catch (error) {
//       console.error('Error uploading gallery item:', error);
//       swalHelper.showToast('Failed to upload gallery item', 'error');
//       throw error;
//     }
//   }

//   // Keep existing method for backward compatibility
//   async addMediaToEvent(id: string, formData: FormData): Promise<any> {
//     try {
//       this.getHeaders();
      
//       // Add the event ID to formData if not already present
//       if (!formData.has('id')) {
//         formData.append('id', id);
//       }

//       const response = await this.apiManager.request(
//         {
//           url: apiEndpoints.UPLOAD_GALLERY_ITEM, // /event/gallery
//           method: 'POST',
//         },
//         formData,
//         this.headers
//       );

//       return response;
//     } catch (error) {
//       console.error('Error adding media to event:', error);
//       swalHelper.showToast('Failed to add media to event', 'error');
//       throw error;
//     }
//   }

//   // Keep existing method - assuming you have a gallery endpoint
//   async getEventGallery(id: string): Promise<any> {
//     try {
//       this.getHeaders();

//       const response = await this.apiManager.request(
//         {
//           url: `${apiEndpoints.GET_EVENT_GALLERY}/${id}`, // Custom endpoint for gallery
//           method: 'GET',
//         },
//         null,
//         this.headers
//       );

//       return response.data || { photos: [], videos: [] };
//     } catch (error) {
//       console.error('Error fetching event gallery:', error);
//       // Return empty gallery structure instead of showing error for better UX
//       return { photos: [], videos: [] };
//     }
//   }

//   // Updated to match new API structure
//   async registerForEvent(eventId: string, ticketType: string): Promise<any> {
//     try {
//       this.getHeaders();

//       const data = {
//         id: eventId,
//         ticketType
//       };

//       const response = await this.apiManager.request(
//         {
//           url: apiEndpoints.REGISTER_FOR_EVENT, // /event/register
//           method: 'POST',
//         },
//         data,
//         this.headers
//       );

//       return response;
//     } catch (error) {
//       console.error('Error registering for event:', error);
//       swalHelper.showToast('Failed to register for event', 'error');
//       throw error;
//     }
//   }

//   // Updated to use new registrations API
//   async getEventRegistrations(payload: { id: string; page: number; limit: number }): Promise<any> {
//     try {
//       this.getHeaders();

//       const response = await this.apiManager.request(
//         {
//           url: apiEndpoints.GET_EVENT_REGISTRATIONS, // /admin/event/registrations
//           method: 'POST',
//         },
//         payload,
//         this.headers
//       );

//       return response;
//     } catch (error) {
//       console.error('Error fetching event registrations:', error);
//       swalHelper.showToast('Failed to fetch event registrations', 'error');
//       throw error;
//     }
//   }



//   // New method for admin login
//   async adminLogin(credentials: { email: string; password: string }): Promise<any> {
//     try {
//       // No headers needed for login
//       const response = await this.apiManager.request(
//         {
//           url: apiEndpoints.ADMIN_LOGIN, // /admin/login
//           method: 'POST',
//         },
//         credentials,
//         []
//       );

//       return response;
//     } catch (error) {
//       console.error('Error in admin login:', error);
//       swalHelper.showToast('Failed to login', 'error');
//       throw error;
//     }
//   }

//   // New method for creating admin
//   // async createAdmin(adminData: { email: string; password: string; name: string }): Promise<any> {
//   //   try {
//   //     // No headers needed for registration
//   //     const response = await this.apiManager.request(
//   //       {
//   //         url: apiEndpoints.CREATE_ADMIN, // /admin/createAdmin
//   //         method: 'POST',
//   //       },
//   //       adminData,
//   //       []
//   //     );

//   //     return response;
//   //   } catch (error) {
//   //     console.error('Error creating admin:', error);
//   //     swalHelper.showToast('Failed to create admin account', 'error');
//   //     throw error;
//   //   }
//   // }

//   // Helper method to list events with proper payload structure
//   async listEvents(payload: { page: number; limit: number; isActive: string }): Promise<any> {
//     try {
//       this.getHeaders();

//       const response = await this.apiManager.request(
//         {
//           url: apiEndpoints.LIST_EVENTS, // /admin/event/list
//           method: 'POST',
//         },
//         payload,
//         this.headers
//       );

//       return response;
//     } catch (error) {
//       console.error('Error listing events:', error);
//       swalHelper.showToast('Failed to list events', 'error');
//       throw error;
//     }
//   }
// }