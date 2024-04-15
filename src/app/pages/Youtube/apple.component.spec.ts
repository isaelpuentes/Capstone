import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppleComponent } from './apple.component';

describe('AppleComponent', () => {
  let component: AppleComponent;
  let fixture: ComponentFixture<AppleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppleComponent] // Correct import statement
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AppleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  beforeEach(() => {
    fixture = TestBed.createComponent(AppleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
