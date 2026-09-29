import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.css'],
})
export class PrivacyPolicyComponent implements OnInit {
  readonly lastUpdated = '2 de septiembre de 2026';

  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Política de Privacidad | Vöhk Comunidades');
    this.meta.updateTag({
      name: 'description',
      content:
        'Política de Privacidad de Vöhk Comunidades: datos tratados, finalidades, proveedores, conservación y derechos de los usuarios.',
    });
  }
}
