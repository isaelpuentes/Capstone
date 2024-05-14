import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import config from '../../auth_config.json';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}
}
@Injectable({
  providedIn: 'root',
})
export class YoutubeApiService {
  constructor(private http: HttpClient) {}
  // Add methods for interacting with the YouTube API
}