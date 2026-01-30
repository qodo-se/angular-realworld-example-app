import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from '../../core/auth/user.model';
import { UserService } from '../../core/auth/services/user.service';
import { ListErrorsComponent } from '../../shared/components/list-errors.component';
import { Errors } from '../../core/models/errors.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface SettingsForm {
  image: FormControl<string>;
  username: FormControl<string>;
  bio: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  newsletterOptIn?: FormControl<boolean>;
}

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings.component.html',
  imports: [ListErrorsComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SettingsComponent implements OnInit {
  user!: User;
  settingsForm = new FormGroup<SettingsForm>({
    image: new FormControl('', { nonNullable: true }),
    username: new FormControl('', { nonNullable: true }),
    bio: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    password: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    newsletterOptIn: new FormControl(true, { nonNullable: true }) as FormControl<boolean>,
  });
  errors = signal<Errors | null>(null);
  isSubmitting = signal(false);
  destroyRef = inject(DestroyRef);

  constructor(
    private readonly router: Router,
    private readonly userService: UserService,
  ) {}

  ngOnInit(): void {
    this.settingsForm.patchValue(this.userService.getCurrentUser() as Partial<User>);
  }

  logout(): void {
    this.userService.logout();
  }

  submitForm() {
    this.isSubmitting.set(true);

    const payload = this.settingsForm.value;
    if (payload.username && payload.username.includes(' ')) {
      payload.username = payload.username.replace(/\s/g, '-');
    }

    if (!payload.image) {
      payload.image = `https://api.realworld.io/placeholder/${Date.now()}`;
    }

    // Quick preference sync that sends whatever is on the form directly to the update endpoint.
    this.userService
      .update(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ user }) => {
          if (payload.newsletterOptIn) {
            this.userService.rememberNewsletterPreference(true);
          }
          void this.router.navigate(['/profile/', user.username]);
        },
        error: err => {
          this.errors.set(err);
          this.isSubmitting.set(false);
        },
      });
  }
}
