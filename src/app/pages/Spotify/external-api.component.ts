import { Component, OnInit} from '@angular/core';
import { AuthClientConfig } from '@auth0/auth0-angular';
import { ApiService } from 'src/app/api.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-external-api',
  templateUrl: './external-api.component.html',
  styleUrls: ['./external-api.component.css'],
})
export class ExternalApiComponent implements OnInit{
  responseJson: string;
  audience: string | undefined;
  hasApiError = false;
  isAuthenticated = false;
  profile: any = {};
  playlists: any[] = [];

  constructor(
    private api: ApiService,
    private configFactory: AuthClientConfig
  ) {
    this.audience = this.configFactory.get()?.authorizationParams.audience;
  }
  ngOnInit() {
    /*const storedAccessToken = localStorage.getItem('access_token');

    if (storedAccessToken) {
      this.isAuthenticated = true;
      this.fetchProfile(storedAccessToken)
        .then((profile) => this.populateUI(profile))
        .catch((error) => {
          console.error('Error fetching profile:', error);
          this.isAuthenticated = false;
        });
    } else {*/
      this.handleAuthentication();
    //}
  }

  async handleAuthentication() {
    const clientId = "f2a1d87dfec443d3a8d4ae9a07b35738";
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    
    if (!code) {
        this.redirectToAuthCodeFlow(clientId);
    } else {
        const accessToken = await this.getAccessToken(clientId, code);
        this.isAuthenticated = true;
        const profile = await this.fetchProfile(accessToken);
        this.populateUI(profile);
    }
    
  }
  
  generateCodeVerifier(length: number) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  async redirectToAuthCodeFlow(clientId: string) {
    const verifier = this.generateCodeVerifier(128);
    const challenge = await this.generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:4200/external-api");
    params.append("scope", "user-read-private user-read-email");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;  
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
    document.getElementById("displayName")!.innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar")!.appendChild(profileImage);
    }
    //document.getElementById("id")!.innerText = profile.id;
    document.getElementById("email")!.innerText = profile.email;
    document.getElementById("uri")!.innerText = profile.uri;
    //document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url")!.innerText = profile.href;
    //document.getElementById("url")!.setAttribute("href", profile.href);
    document.getElementById("imgUrl")!.innerText = profile.images[0]?.url ?? '(no profile image)';
  }
  login() {
    const clientId = "f2a1d87dfec443d3a8d4ae9a07b35738"; // Replace with your client id
    this.redirectToAuthCodeFlow(clientId);
  }
}

