import axios, { type AxiosInstance } from 'axios'
import { toast } from 'vue3-toastify'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response

          if (status === 401) {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('access_token')
            window.location.href = '/login'
          } else if (status === 403) {
            toast.error('Access denied')
          } else if (status === 404) {
            toast.error('Resource not found')
          } else if (status >= 500) {
            toast.error('Server error. Please try again later.')
          } else {
            toast.error(data.detail || 'An error occurred')
          }
        } else {
          toast.error('Network error. Please check your connection.')
        }

        return Promise.reject(error)
      }
    )
  }

  // Auth
  async login(email: string, password: string) {
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)

    const response = await this.client.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  async getMe() {
    const response = await this.client.get('/auth/me')
    return response.data
  }

  // Tickets
  async getTickets(params?: any) {
    const response = await this.client.get('/tickets', { params })
    return response.data
  }

  async getTicket(id: string) {
    const response = await this.client.get(`/tickets/${id}`)
    return response.data
  }

  async createTicket(data: any) {
    const response = await this.client.post('/tickets', data)
    return response.data
  }

  async updateTicket(id: string, data: any) {
    const response = await this.client.patch(`/tickets/${id}`, data)
    return response.data
  }

  async changeTicketStatus(id: string, data: any) {
    const response = await this.client.post(`/tickets/${id}/status`, data)
    return response.data
  }

  async getTicketHistory(id: string) {
    const response = await this.client.get(`/tickets/${id}/history`)
    return response.data
  }

  // Assets
  async getSites(params?: any) {
    const response = await this.client.get('/assets/sites', { params })
    return response.data
  }

  async getChargers(params?: any) {
    const response = await this.client.get('/assets/chargers', { params })
    return response.data
  }

  async getCharger(id: string) {
    const response = await this.client.get(`/assets/chargers/${id}`)
    return response.data
  }

  // Worklogs
  async createWorklog(ticketId: string, data: any) {
    const response = await this.client.post(`/worklogs/tickets/${ticketId}/worklogs`, data)
    return response.data
  }

  async getWorklogs(ticketId: string) {
    const response = await this.client.get(`/worklogs/tickets/${ticketId}/worklogs`)
    return response.data
  }

  // Assignments
  async assignTicket(ticketId: string, data: any) {
    const response = await this.client.post(`/assignments/tickets/${ticketId}/assign`, data)
    return response.data
  }

  // Reports
  async getReportSummary(params: any) {
    const response = await this.client.get('/reports/summary', { params })
    return response.data
  }

  async getReportSnapshots(params?: any) {
    const response = await this.client.get('/reports/snapshots', { params })
    return response.data
  }

  async getReportSnapshot(id: string) {
    const response = await this.client.get(`/reports/snapshots/${id}`)
    return response.data
  }

  async getReportStats(params: any) {
    const response = await this.client.get('/reports/stats', { params })
    return response.data
  }

  async getReportTrends(params: any) {
    const response = await this.client.get('/reports/trends', { params })
    return response.data
  }

  async getReportDistribution(params: any) {
    const response = await this.client.get('/reports/distribution', { params })
    return response.data
  }

  async exportTickets(params: any) {
    const response = await this.client.get('/reports/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  }

  async exportReportData(params: any, format: 'csv' | 'xlsx' = 'csv') {
    const response = await this.client.get(`/reports/export/${format}`, {
      params,
      responseType: 'blob',
    })
    return response.data
  }

  // CSMS
  async getChargerStatus(chargerId: string) {
    const response = await this.client.get(`/csms/chargers/${chargerId}/status`)
    return response.data
  }

  async getChargerEvents(chargerId: string, params?: any) {
    const response = await this.client.get(`/csms/chargers/${chargerId}/events`, { params })
    return response.data
  }
}

export const apiClient = new ApiClient()
