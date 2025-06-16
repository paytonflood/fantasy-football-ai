// src/lib/external/sleeper.ts
import axios from 'axios'

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1'

export class SleeperAPI {
    private token?: string

    constructor(token?: string) {
        this.token = token
    }

    async getUser(userId?: string) {
        const endpoint = userId ? `/user/${userId}` : '/user'
        const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {}

        const response = await axios.get(`${SLEEPER_BASE_URL}${endpoint}`, { headers })
        return response.data
    }

    async getUserLeagues(userId: string, season: string = '2024') {
        const response = await axios.get(`${SLEEPER_BASE_URL}/user/${userId}/leagues/nfl/${season}`)
        return response.data
    }

    async getLeagueRosters(leagueId: string) {
        const response = await axios.get(`${SLEEPER_BASE_URL}/league/${leagueId}/rosters`)
        return response.data
    }

    async getLeagueUsers(leagueId: string) {
        const response = await axios.get(`${SLEEPER_BASE_URL}/league/${leagueId}/users`)
        return response.data
    }

    async getPlayers() {
        const response = await axios.get(`${SLEEPER_BASE_URL}/players/nfl`)
        return response.data
    }

    async getWaiverWire(leagueId: string, week: number) {
        const response = await axios.get(`${SLEEPER_BASE_URL}/league/${leagueId}/transactions/${week}`)
        return response.data
    }
}