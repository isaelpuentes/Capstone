import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AuthClientConfig } from '@auth0/auth0-angular';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/api.service';
import { GoogleApiService } from 'googleapi';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

declare const gapi: any;

//https://developers.google.com/youtube/v3/guides/auth/client-side-web-apps
//rewriten to work with angular and TypeScirpt version isntead of JavaScript
@Component({
  selector: 'app-apple',
  templateUrl: './apple.component.html',
  styleUrl: './apple.component.css'
})
export class AppleComponent implements OnInit {
  isAuthorized: boolean = false;
  playlists: any[] = [];
  newPlaylistName: string = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private httpClient: HttpClient) { }

  ngOnInit(): void {
    this.checkOAuthResponse();
  }

  checkOAuthResponse(): void {
    const fragmentString = window.location.hash.substring(1);
    const params = {};
    const regex = /([^&=]+)=([^&]*)/g;
    let m;

    while ((m = regex.exec(fragmentString))) {
      params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }

    if (Object.keys(params).length > 0) {
      localStorage.setItem('oauth2-test-params', JSON.stringify(params));
      if (params['state'] && params['state'] === 'try_sample_request') {
        this.playlistrequest();
      }
    }
    console.log(this.isAuthorized)
  }

  playlistrequest(): void {
    const params = JSON.parse(localStorage.getItem('oauth2-test-params') || '{}');
    console.log(params)
    if (params && params['access_token']) {
      this.isAuthorized = true; // Set isAuthorized to true
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&access_token=' + params['access_token']);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          // Parse the JSON response
          const response = JSON.parse(xhr.responseText);

          // Now response is in scope and can be used
          this.playlists = response.items;

          // Ensure Angular updates the view
          this.cdr.detectChanges();

          console.log(this.playlists); // For debugging
        } else if (xhr.readyState === 4 && xhr.status !== 200) {
          // Handle errors or unsuccessful responses
          this.oauth2SignIn();
          console.error('Failed to fetch playlists:', xhr.responseText);
        }
      };
      xhr.send(null);
    }
    else {
      this.oauth2SignIn();
    }
  }

  oauth2SignIn(): void {
    const YOUR_CLIENT_ID = '169890508193-q069nrrp70cgjcaekl9n08fafvcppgmi.apps.googleusercontent.com';
    const YOUR_REDIRECT_URI = 'http://localhost:4200/apple';
    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = {
      'client_id': YOUR_CLIENT_ID,
      'redirect_uri': YOUR_REDIRECT_URI,
      'scope': 'https://www.googleapis.com/auth/youtube.readonly',
      'state': 'try_sample_request',
      'include_granted_scopes': 'true',
      'response_type': 'token'
    };

    let form = document.createElement('form');
    form.method = 'GET';
    form.action = oauth2Endpoint;

    for (let p in params) {
      let input = document.createElement('input');
      input.type = 'hidden';
      input.name = p;
      input.value = params[p];
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    //debug
    //console.log(this.isAuthorized)
  }
  checkAuthorization(): void {
    const params = JSON.parse(localStorage.getItem('oauth2-test-params') || '{}');
    this.isAuthorized = params && params['access_token'];
  }
  async togglePreview(playlist: any) {
    if (!playlist) return;

    if (playlist.showPreview) {
      // If preview is currently shown, hide it
      playlist.tracks = undefined;
      playlist.showPreview = false;
    } else {
      // If preview is not shown, fetch and display it
      const params = JSON.parse(localStorage.getItem('oauth2-test-params') || '{}');
      const token = params['access_token'];
      if (!token) {
        console.error('Access token not found');
        return;
      }
      try {
        const response = await this.httpClient.get(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=5&playlistId=${playlist.id}&access_token=${token}`
        ).toPromise();

        // Check if the response is successful
        if (!response || !response['items']) {
          throw new Error(`Failed to fetch playlist ${playlist.id}`);
        }

        // Extract preview tracks with only song name and artist
        const previewTracks = response['items'].map((item: any) => ({
          title: item.snippet.title, // Song name
          artist: item.snippet.videoOwnerChannelTitle // Artist/channel
        }));

        playlist.tracks = previewTracks;
        playlist.showPreview = true;
      } catch (error) {
        console.error('Error previewing playlist:', error);
      }
    }
  }
  createPlaylist(): void {
    if (!this.newPlaylistName.trim()) {
      console.error('Playlist name cannot be empty');
      return;
    }

    const params = JSON.parse(localStorage.getItem('oauth2-test-params') || '{}');
    const token = params['access_token'];
    if (!token) {
      console.error('Access token not found');
      return;
    }

    const playlistData = {
      snippet: {
        title: this.newPlaylistName.trim()
      }
    };

    this.httpClient.post(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&access_token=${token}`,
      playlistData
    ).subscribe(
      (response) => {
        console.log('Playlist created successfully:', response);
        // Fetch and display the updated list of playlists after creating the new one
        this.playlistrequest();
      },
      (error) => {
        console.error('Error creating playlist:', error);
      }
    );
  }

  deletePlaylist(playlistId: string): void {
    const params = JSON.parse(localStorage.getItem('oauth2-test-params') || '{}');
    const token = params['access_token'];
    if (!token) {
      console.error('Access token not found');
      return;
    }

    this.httpClient.delete(
      `https://www.googleapis.com/youtube/v3/playlists?id=${playlistId}&access_token=${token}`
    ).subscribe(
      () => {
        console.log('Playlist deleted successfully');
        // Fetch and display the updated list of playlists after deleting the playlist
        this.playlistrequest();
      },
      (error) => {
        console.error('Error deleting playlist:', error);
      }
    );
  }
  confirmDeletePlaylist(playlistId: string): void {
    const confirmation = window.confirm('Are you sure you want to delete this playlist?');
    if (confirmation) {
      this.deletePlaylist(playlistId);
    }
  }
  async searchVideo(trackName: string, artist: string, token: string): Promise<string | null> {
    try {
      // Perform a search using the YouTube Data API
      const response = await this.httpClient.get<any>(
        `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(trackName)}+${encodeURIComponent(artist)}&type=video&part=snippet&key=AIzaSyDJyy4c1iksdXrXNH9u7j6LOTu7xJjOL_k`
      ).toPromise();

      // Extract the video ID from the response
      const videoId = response?.items?.[0]?.id?.videoId;
      return videoId || null;
    } catch (error) {
      console.error('Error searching for video:', error);
      return null;
    }
  }
  async addToPlaylist(videoId: string, playlistId: string, token: string): Promise<void> {
    try {
      // Add the video to the playlist using the YouTube Data API
      await this.httpClient.post<any>(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&access_token=${token}`,
        {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId
            }
          }
        }
      ).toPromise();
      console.log('Video added to playlist successfully.');
    } catch (error) {
      console.error('Error adding video to playlist:', error);
    }
  }
  async copyPlaylistToClipboard(playlistId: string) {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('Access token not found');
        return;
      }
  
      // Use Angular's HttpClient for making the request
      const response = await this.httpClient.get<any>(
        `https://www.googleapis.com/youtube/v3/playlistItems`,
        {
          params: {
            part: 'snippet',
            maxResults: '50',
            playlistId: playlistId,
            key: 'AIzaSyDJyy4c1iksdXrXNH9u7j6LOTu7xJjOL_k'
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      ).toPromise();
  
      // Check if the response is successful
      if (!response || !response.items) {
        console.error('Failed to fetch playlist tracks');
        return;
      }
  
      // Extract song information from the YouTube Data API response
      const songList = response.items.map(item => item.snippet.title).join('\n');
  
      // Copy the song list to the clipboard
      await navigator.clipboard.writeText(songList);
      alert('Songs copied to clipboard!');
    } catch (error) {
      console.error('Error copying songs to clipboard:', error);
    }
  }  

  clearOAuthData(): void {
    localStorage.removeItem('oauth2-test-params');
    this.isAuthorized = false; // Update authorization status
    console.log('OAuth data cleared.');
  }

}
