import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthClientConfig } from '@auth0/auth0-angular';
import { ApiService } from 'src/app/api.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppleComponent } from 'src/app/pages/Youtube/apple.component';
//import { GoogleApiService } from 'googleapi';

//resources 
//https://developer.spotify.com/documentation/web-api/howtos/web-app-profile

@Component({
  selector: 'app-external-api',
  templateUrl: './external-api.component.html',
  styleUrls: ['./external-api.component.css'],
})
export class ExternalApiComponent implements OnInit {
  responseJson: string;
  profile: any = {};
  playlists: any[] = [];
  isAuthorizedSpotify: boolean = false;
  isAuthorizedYoutube: boolean = false;
  newPlaylistName: string = '';
  selectedPlaylistIds: string[] = [];
  clientIdSpotify = "f2a1d87dfec443d3a8d4ae9a07b35738";
  clientIdYoutube = "169890508193-q069nrrp70cgjcaekl9n08fafvcppgmi.apps.googleusercontent.com";
  songList: string = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private api: ApiService,
    private route: ActivatedRoute,
    //private googleApiService: AppleComponent
  ) { }
  ngOnInit() {
    this.handleAuthentication();
  }

  async handleAuthentication() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      this.redirectToAuthCodeFlow(this.clientIdSpotify);
    } else {
      const accessToken = await this.getAccessToken(this.clientIdSpotify, code);
      const profile = await this.fetchProfile(accessToken);
      this.isAuthorizedSpotify = true;
      this.populateUI(profile);
    }
  }
  async redirectToAuthCodeFlow(clientId: string) {
    const verifier = this.generateCodeVerifier(128);
    const challenge = await this.generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:4200/external-api");
    params.append("scope", "user-read-private user-read-email playlist-modify-public playlist-modify-private");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }
  generateCodeVerifier(length: number) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
  //In this function, a new URLSearchParams object is created,
  // and we add the client_id, response_type, redirect_uri and scope parameters to it
  async generateCodeChallenge(codeVerifier: string) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  //we load the verifier from local storage and using both the code returned from the callback 
  //and the verifier to perform a POST to the Spotify token API
  async getAccessToken(clientId: string, code: string): Promise<string> {
    const verifier = localStorage.getItem("verifier");
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:4200/external-api");
    params.append("code_verifier", verifier!);

    const result = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    const { access_token } = await result.json();
    localStorage.setItem('access_token', access_token);
    this.isAuthorizedSpotify = true; // Set isAuthorized to true
    return access_token;
  }
  //Fetch API to get the profile data
  async fetchProfile(token: string): Promise<any> {
    // Fetch user's profile
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    const profile = await profileResponse.json();

    // Fetch user's playlists
    const playlistsResponse = await fetch("https://api.spotify.com/v1/me/playlists", {
      method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    const playlistsData = await playlistsResponse.json();

    // Update playlists property
    this.playlists = playlistsData.items;

    return profile;
  }

  // display the profile data in the UI
  populateUI(profile: any) {
    // Safe querying of elements
    const displayNameElement = document.getElementById("displayName");
    const avatarElement = document.getElementById("avatar");
    const emailElement = document.getElementById("email");
    const uriElement = document.getElementById("uri");
    const urlElement = document.getElementById("url");
    const imgUrlElement = document.getElementById("imgUrl");

    // Update display name
    if (displayNameElement) {
      displayNameElement.innerText = profile.display_name || 'N/A';
    }

    // Handle profile image
    if (avatarElement && profile.images && profile.images.length > 0) {
      const profileImage = new Image(250, 250);
      profileImage.src = profile.images[0].url;
      avatarElement.innerHTML = ''; // Clear existing content
      avatarElement.appendChild(profileImage);
    } else if (avatarElement) {
      avatarElement.innerText = 'No profile image';
    }

    // Update email
    if (emailElement) {
      emailElement.innerText = profile.email || 'N/A';
    }

    // Update URI and make it a link if needed
    if (uriElement) {
      uriElement.innerText = profile.uri || 'N/A';
      uriElement.innerHTML = `<a href="${profile.external_urls.spotify}">${profile.uri}</a>`;
    }

    // Update URL and make it a link
    if (urlElement) {
      urlElement.innerText = profile.href || 'N/A';
      urlElement.innerHTML = `<a href="${profile.href}">${profile.href}</a>`;
    }

    // Handle the image URL text
    if (imgUrlElement) {
      imgUrlElement.innerText = (profile.images && profile.images.length > 0) ? profile.images[0].url : '(no profile image)';
    }
  }
  async togglePreview(playlistId: string) {
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    if (playlist.showPreview) {
      // If preview is currently shown, hide it
      playlist.preview = undefined;
      playlist.showPreview = false;
    } else {
      // If preview is not shown, fetch and display it
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('Access token not found');
        return;
      }

      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch playlist ${playlistId}`);
      }

      const data = await response.json();
      playlist.preview = data.items.slice(0, 5).map(item => ({
        name: item.track.name,
        artist: item.track.artists.map(artist => artist.name).join(', ')
      }));
      playlist.showPreview = true;
    }
    this.cdr.detectChanges(); // Trigger change detection if needed
  }
  async fetchUserId(token: string): Promise<string | null> {
    try {
      // Make a request to the Spotify API to fetch the user's profile
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        // If the response is not ok, log the error and return null
        console.error(`Failed to fetch user profile: ${await response.text()}`);
        return null;
      }

      const data = await response.json();
      // Return the user ID from the profile data
      return data.id;
    } catch (error) {
      // Log any errors that occur during the fetch process
      console.error('Error fetching user ID:', error);
      return null;
    }
  }
  async createPlaylist(event: Event) {
    event.preventDefault();

    if (!this.newPlaylistName) {
      console.error('Playlist name is required');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('Access token not found');
      return;
    }

    // Fetch the user ID dynamically
    const userId = await this.fetchUserId(token);
    if (!userId) {
      console.error('Unable to retrieve user ID');
      return;
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: this.newPlaylistName }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to create playlist: ${errorMessage}`);
      }

      const data = await response.json();
      this.playlists.push(data);
      this.newPlaylistName = '';  // Reset the input field after successful creation
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  }
  async deletePlaylist(playlistId: string) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('Access token not found');
      return;
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to delete playlist: ${errorMessage}`);
      }

      // Remove the playlist from the local array
      this.playlists = this.playlists.filter(playlist => playlist.id !== playlistId);
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  }
  confirmDeletePlaylist(playlistId: string): void {
    const confirmation = window.confirm('Are you sure you want to delete this playlist?');
    if (confirmation) {
      this.deletePlaylist(playlistId);
    }
  }

  async copyPlaylistToClipboard(playlistId: string) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('Access token not found');
      return;
    }

    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      console.error('Failed to fetch playlist tracks');
      return;
    }

    const data = await response.json();
    const songList = data.items.map(item => `${item.track.name} by ${item.track.artists.map(artist => artist.name).join(', ')}`).join('\n');

    navigator.clipboard.writeText(songList).then(() => {
      alert('Songs copied to clipboard!');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  }
  async addSongsToPlaylist(playlistId: string, songList: string[]): Promise<boolean> {
    if (songList.length === 0) {
      alert('Please enter at least one song.');
      return false;
    }
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('Access token not found');
      return false;
    }
  
    const position = 0; // Set the position to 0 to append the songs to the playlist
    const body = JSON.stringify({ uris: songList, position: position });
  
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: body
      });
  
      if (!response.ok) {
        console.error(`Failed to add songs to playlist ${playlistId}:`, await response.text());
        return false;
      }
  
      console.log(`Songs added to playlist ${playlistId} successfully.`);
      return true;
    } catch (error) {
      console.error('Error adding songs to playlist:', error);
      return false;
    }
  }  
  async getTrackURI(songName: string, artist: string): Promise<string | null> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('Access token not found');
      return null;
    }
  
    try {
      // Search for the track using the Spotify API
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songName)}%20artist:${encodeURIComponent(artist)}&type=track`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        console.error('Failed to fetch track information:', await response.text());
        return null;
      }
  
      const data = await response.json();
      const track = data.tracks.items[0]; // Assuming the first track is the one we want
      if (!track) {
        console.error('Track not found');
        return null;
      }
  
      return track.uri; // Return the Spotify track URI
    } catch (error) {
      console.error('Error fetching track information:', error);
      return null;
    }
  }
  
  async openAddSongsPopup(playlistId: string): Promise<void> {
    const songListInput = prompt('Enter the list of songs (one song per line)');
    if (songListInput) {
      const songNames = songListInput.split('\n');
      
      const trackURIs: string[] = [];
      
      for (const songName of songNames) {
        const artist = prompt(`Enter the artist for the song "${songName}"`);
        if (!artist) {
          alert(`Artist not provided for the song "${songName}". Skipping.`);
          continue;
        }
        
        const trackURI = await this.getTrackURI(songName, artist);
        if (trackURI) {
          trackURIs.push(trackURI); // Add the obtained track URI to the array
        } else {
          alert(`Failed to fetch Spotify track URI for the song "${songName}". Skipping.`);
        }
      }
      
      if (trackURIs.length > 0) {
        const success = await this.addSongsToPlaylist(playlistId, trackURIs);
        if (success) {
          alert('Songs added successfully!');
        } else {
          alert('Failed to add songs. Please try again.');
        }
      } else {
        alert('No valid track URIs found. Please try again with different songs.');
      }
    }
  }
  
  updateSelectedPlaylists(event: any, playlist: any) {
    if (event.target.checked) {
      this.selectedPlaylistIds.push(playlist.id);
    } else {
      this.selectedPlaylistIds = this.selectedPlaylistIds.filter(id => id !== playlist.id);
    }
  }

  clearOAuthData(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('verifier');
    this.isAuthorizedSpotify = false; // Update authorization status
    console.log('OAuth data cleared.');
    this.redirectToAuthCodeFlow(this.clientIdSpotify);
  }
}