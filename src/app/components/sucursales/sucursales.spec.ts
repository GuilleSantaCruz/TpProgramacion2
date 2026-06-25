import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SucursalesComponent } from './sucursales';

describe('Sucursales', () => {
  let component: SucursalesComponent;
  let fixture: ComponentFixture<SucursalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SucursalesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SucursalesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
