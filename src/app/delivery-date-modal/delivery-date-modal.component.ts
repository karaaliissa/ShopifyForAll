import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-delivery-date-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery-date-modal.component.html',
  styleUrls: ['./delivery-date-modal.component.css']
})
export class DeliveryDateModalComponent {
  @Input() show = false;
  @Input() order: any;
  @Input() initialDate: string | null = null; // 'YYYY-MM-DD'
  @Input() initialNote: string | null = null; // new
  @Output() save = new EventEmitter<{ date: string | null, note: string | null }>();
  @Output() close = new EventEmitter<void>();

  value: string | null = null;
  noteValue: string | null = null;

  ngOnChanges() {
    this.value = this.initialDate ?? null;
    this.noteValue = this.initialNote ?? null;
  }

  onSave() { this.save.emit({ date: this.value && this.value.trim() ? this.value : null, note: this.noteValue && this.noteValue.trim() ? this.noteValue : null }); }
  onClose() { this.close.emit(); }
}
