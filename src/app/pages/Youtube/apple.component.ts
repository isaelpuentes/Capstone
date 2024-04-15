import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AuthClientConfig } from '@auth0/auth0-angular';
import { Router, ActivatedRoute } from '@angular/router';
import { GoogleApiService } from 'googleapi';

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

  constructor(private cdr: ChangeDetectorRef) { }

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
        this.trySampleRequest();
      }
    }
    console.log(this.isAuthorized)
  }
  
  trySampleRequest(): void {
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
    console.log(this.isAuthorized)
  }
  
  oauth2SignIn(): void {
    const YOUR_CLIENT_ID = '169890508193-q069nrrp70cgjcaekl9n08fafvcppgmi.apps.googleusercontent.com';
    const YOUR_REDIRECT_URI = 'http://localhost:4200/apple';
    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = {
      'client_id': YOUR_CLIENT_ID,
      'redirect_uri': YOUR_REDIRECT_URI,
      'scope': 'https://www.googleapis.com/auth/youtube.force-ssl',
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
    console.log(this.isAuthorized)

  }
  clearOAuthData(): void {
    localStorage.removeItem('oauth2-test-params');
    this.isAuthorized = false; // Update authorization status
    console.log('OAuth data cleared.');
  }  
  checkAuthorization(): void {
    const params = JSON.parse(localStorage.getItem('oauth2-test-params') || '{}');
    this.isAuthorized = params && params['access_token'];
  }
  
}
