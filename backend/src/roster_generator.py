#!/usr/bin/env python3
"""
Peninsula Health Roster Generator
Integrated with existing Node.js backend
"""

import json
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass
from collections import defaultdict
import csv
import io


# ===========================
# DATA MODELS
# ===========================

@dataclass
class Doctor:
    """Doctor data model compatible with existing config structure."""
    name: str
    eft: float
    rosebud_preference: int = 0
    unavailable_dates: List[str] = None
    email: str = ""
    phone: str = ""
    specialization: str = ""
    status: str = "active"
    
    def __post_init__(self):
        if self.unavailable_dates is None:
            self.unavailable_dates = []


@dataclass  
class Shift:
    """Shift data model."""
    site: str
    role: str
    shift_type: str
    duration_hours: float = 10.0
    is_undesirable: bool = False
    
    def get_penalty_score(self, is_friday: bool = False) -> float:
        """Calculate penalty score for shift assignment."""
        penalty = 0.0
        
        # Leadership roles (Blue, Green)
        if self.role in ["Blue", "Green"]:
            penalty += 3.0
            
        # Rosebud PM shifts
        if self.site == "Rosebud" and self.shift_type == "PM":
            penalty += 3.0
            
        # Friday PM shifts
        if is_friday and self.shift_type == "PM":
            penalty += 2.0
            
        # General Rosebud preference
        if self.site == "Rosebud":
            penalty += 1.0
            
        return penalty


# ===========================
# SHIFT TEMPLATE SYSTEM
# ===========================

class ShiftTemplate:
    """Manages all shift types and templates."""
    
    def __init__(self):
        self.frankston_shifts = self._create_frankston_shifts()
        self.rosebud_shifts = self._create_rosebud_shifts()
        self.non_clinical_shifts = self._create_non_clinical_shifts()
    
    def _create_frankston_shifts(self) -> List[Shift]:
        """Create Frankston clinical shifts."""
        roles = ["Blue", "Yellow", "Pink", "Brown", "EPIC"]
        shifts = []
        
        # AM shifts
        for role in roles:
            shifts.append(Shift(
                site="Frankston",
                role=role,
                shift_type="AM",
                duration_hours=10.0,
                is_undesirable=(role == "Blue")
            ))
        
        # PM shifts  
        for role in ["Green", "Orange", "Pink", "Brown"]:
            shifts.append(Shift(
                site="Frankston", 
                role=role,
                shift_type="PM",
                duration_hours=10.0,
                is_undesirable=(role == "Green")
            ))
            
        return shifts
    
    def _create_rosebud_shifts(self) -> List[Shift]:
        """Create Rosebud clinical shifts."""
        return [
            Shift(
                site="Rosebud",
                role="Red", 
                shift_type="AM",
                duration_hours=10.0,
                is_undesirable=False
            ),
            Shift(
                site="Rosebud",
                role="Red",
                shift_type="PM", 
                duration_hours=10.0,
                is_undesirable=True
            )
        ]
    
    def _create_non_clinical_shifts(self) -> List[Shift]:
        """Create non-clinical admin shifts."""
        shifts = []
        
        # Frankston admin shifts
        for i in range(1, 9):
            shifts.append(Shift(
                site="Frankston",
                role=f"Admin-{i}",
                shift_type="Admin",
                duration_hours=8.0,
                is_undesirable=False
            ))
        
        # Frankston PM admin shifts
        for i in range(1, 5):
            shifts.append(Shift(
                site="Frankston", 
                role=f"Admin-PM-{i}",
                shift_type="Admin",
                duration_hours=8.0,
                is_undesirable=False
            ))
        
        # Rosebud admin shifts
        for i in range(1, 3):
            shifts.append(Shift(
                site="Rosebud",
                role=f"Admin-{i}",
                shift_type="Admin", 
                duration_hours=8.0,
                is_undesirable=False
            ))
            
        return shifts


# ===========================
# SIMPLE SCHEDULER  
# ===========================

class SimpleScheduler:
    """Simple, fast hospital roster scheduler."""
    
    def __init__(self, doctors: List[Doctor]):
        self.doctors = doctors
        self.shift_template = ShiftTemplate()
        self.assignments = {}
        self.doctor_workloads = {}
        self.weekly_hours_per_eft = 40
        
    def generate_roster(self, start_date: datetime, num_weeks: int) -> bool:
        """Generate roster using simple distribution algorithm."""
        try:
            # Step 1: Calculate upfront targets for all doctors
            self._initialize_doctor_workloads(num_weeks)
            
            # Step 2: Allocate admin shifts throughout the period FIRST
            self._allocate_all_admin_shifts(start_date, num_weeks)
            
            # Step 3: Allocate clinical shifts SECOND
            self._allocate_all_clinical_shifts(start_date, num_weeks)
            
            # Step 4: Verify and maintain ratios
            self._verify_and_adjust_ratios()
            
            # Step 5: Apply optimization constraints
            self._apply_final_optimizations()
            
            return True
            
        except Exception as e:
            print(f"Error generating roster: {e}", file=sys.stderr)
            return False
    
    def _generate_clinical_shifts(self, start_date: datetime, num_weeks: int) -> List[tuple]:
        """Generate all clinical shifts for the period."""
        clinical_shifts = []
        
        for week in range(num_weeks):
            week_start = start_date + timedelta(weeks=week)
            
            for day in range(7):
                current_date = week_start + timedelta(days=day)
                date_str = current_date.strftime("%Y-%m-%d")
                
                # Frankston shifts
                for shift in self.shift_template.frankston_shifts:
                    clinical_shifts.append((date_str, shift))
                
                # Rosebud shifts  
                for shift in self.shift_template.rosebud_shifts:
                    clinical_shifts.append((date_str, shift))
        
        return clinical_shifts
    
    def _initialize_doctor_workloads(self, num_weeks: int):
        """Calculate precise clinical/admin targets maintaining 3:1 ratio."""
        for doctor in self.doctors:
            max_hours = doctor.eft * self.weekly_hours_per_eft * num_weeks
            
            # For 3:1 ratio: total shifts = clinical + admin, where clinical = 3 * admin
            # So: total = 3*admin + admin = 4*admin, therefore admin = total/4, clinical = 3*total/4
            
            # Calculate total shifts possible within max hours
            # Mix of 10-hour clinical and 8-hour admin shifts with 3:1 ratio
            # Average shift duration: (3*10 + 1*8) / 4 = 38/4 = 9.5 hours
            total_shifts_possible = int(max_hours / 9.5)
            
            # Apply 3:1 ratio
            target_admin_shifts = max(0, int(total_shifts_possible / 4))
            target_clinical_shifts = max(0, int(total_shifts_possible * 3 / 4))
            
            # Ensure minimum reasonable values for active doctors
            if doctor.eft >= 0.5:
                target_clinical_shifts = max(2, target_clinical_shifts)
                target_admin_shifts = max(1, target_admin_shifts)
            elif doctor.eft >= 0.25:
                target_clinical_shifts = max(1, target_clinical_shifts)
                # Small EFT doctors may have 0 admin shifts
                if target_clinical_shifts >= 3:
                    target_admin_shifts = max(1, target_admin_shifts)
            
            # Adjust to ensure total hours don't exceed capacity
            total_target_hours = (target_clinical_shifts * 10) + (target_admin_shifts * 8)
            if total_target_hours > max_hours:
                # Proportionally reduce while maintaining ratio
                scale_factor = max_hours / total_target_hours
                target_clinical_shifts = int(target_clinical_shifts * scale_factor)
                target_admin_shifts = int(target_admin_shifts * scale_factor)
                
            self.doctor_workloads[doctor.name] = {
                'total_hours': 0.0,
                'total_shifts': 0,
                'undesirable_shifts': 0,
                'penalty_points': 0.0,  # Track cumulative penalty points for tough shift distribution
                'max_hours': max_hours,
                'remaining_hours': max_hours,
                'target_clinical_shifts': target_clinical_shifts,
                'target_admin_shifts': target_admin_shifts,
                'current_clinical_shifts': 0,
                'current_admin_shifts': 0
            }
            self.assignments[doctor.name] = {}
    
    def _allocate_all_admin_shifts(self, start_date: datetime, num_weeks: int):
        """Allocate admin shifts evenly distributed across the entire period."""
        # Generate all dates
        all_dates = []
        for week in range(num_weeks):
            week_start = start_date + timedelta(weeks=week)
            for day in range(7):
                current_date = week_start + timedelta(days=day)
                all_dates.append(current_date.strftime("%Y-%m-%d"))
        
        admin_shifts = self.shift_template.non_clinical_shifts
        
        # Calculate total admin shifts needed
        total_admin_shifts_needed = sum(
            workload['target_admin_shifts'] 
            for workload in self.doctor_workloads.values()
        )
        
        # Distribute admin shifts evenly across dates
        # Target admin shifts per day
        admin_shifts_per_day = max(1, int(total_admin_shifts_needed / len(all_dates)))
        
        # Assign admin shifts day by day with even distribution
        for date_str in all_dates:
            shifts_assigned_today = 0
            
            # Get doctors who still need admin shifts and are available today
            available_doctors = []
            for doctor_name, workload in self.doctor_workloads.items():
                if (date_str not in self.assignments[doctor_name] and  # Doctor is free
                    workload['current_admin_shifts'] < workload['target_admin_shifts'] and  # Needs admin shifts
                    workload['remaining_hours'] >= 8):  # Has capacity
                    
                    priority = workload['target_admin_shifts'] - workload['current_admin_shifts']
                    available_doctors.append((doctor_name, priority))
            
            # Sort by priority (doctors needing most admin shifts first)
            available_doctors.sort(key=lambda x: x[1], reverse=True)
            
            # Create balanced admin shifts list with Rosebud priority
            frankston_admin_shifts = [s for s in admin_shifts if s.site == "Frankston"]
            rosebud_admin_shifts = [s for s in admin_shifts if s.site == "Rosebud"]
            
            # Ensure proper site distribution: prioritize Rosebud to ensure representation
            balanced_admin_shifts = []
            
            # Add Rosebud shifts first (they are limited, so ensure they get assigned)
            balanced_admin_shifts.extend(rosebud_admin_shifts)
            
            # Then add Frankston shifts
            balanced_admin_shifts.extend(frankston_admin_shifts)
            
            # Assign up to target admin shifts per day using balanced list
            for shift in balanced_admin_shifts:
                if shifts_assigned_today >= admin_shifts_per_day:
                    break
                    
                shift_name = f"{shift.site} {shift.role} {shift.shift_type}"
                
                # Check if this shift type is already assigned today
                shift_taken = any(
                    date_str in self.assignments[dn] and self.assignments[dn][date_str] == shift_name
                    for dn in self.assignments
                )
                
                if not shift_taken and available_doctors:
                    # Assign to first available doctor
                    doctor_name, priority = available_doctors.pop(0)
                    self._assign_shift_to_doctor(doctor_name, date_str, shift)
                    shifts_assigned_today += 1
    
    def _allocate_all_clinical_shifts(self, start_date: datetime, num_weeks: int):
        """Allocate clinical shifts after admin shifts are assigned."""
        # Generate clinical shifts for the period
        clinical_shifts = self._generate_clinical_shifts(start_date, num_weeks)
        
        # Distribute clinical shifts using existing logic, but respect admin assignments
        self._distribute_clinical_shifts_with_admin_constraints(clinical_shifts)
    
    def _distribute_clinical_shifts_with_admin_constraints(self, clinical_shifts: List[tuple]):
        """Distribute clinical shifts while respecting already-assigned admin shifts."""
        shifts_by_date = defaultdict(list)
        for date_str, shift in clinical_shifts:
            shifts_by_date[date_str].append(shift)
        
        # Assign shifts day by day
        for date_str, shifts in shifts_by_date.items():
            for shift in shifts:
                available_doctors = []
                
                for doctor in self.doctors:
                    # Skip if doctor already has assignment on this date
                    if date_str in self.assignments[doctor.name]:
                        continue
                        
                    workload = self.doctor_workloads[doctor.name]
                    
                    # Check if doctor still needs clinical shifts and has capacity
                    if (workload['current_clinical_shifts'] < workload['target_clinical_shifts'] and
                        workload['remaining_hours'] >= shift.duration_hours):
                        available_doctors.append(doctor.name)
                
                if available_doctors:
                    # Choose doctor with most remaining clinical shifts needed
                    best_doctor = max(available_doctors, 
                        key=lambda d: self.doctor_workloads[d]['target_clinical_shifts'] - 
                                     self.doctor_workloads[d]['current_clinical_shifts'])
                    
                    self._assign_shift_to_doctor(best_doctor, date_str, shift)
    
    def _verify_and_adjust_ratios(self):
        """Verify that all doctors have achieved close to 3:1 ratios."""
        # This is a placeholder for ratio verification logic
        # In practice, we might swap assignments or make minor adjustments
        pass
    
    def _apply_final_optimizations(self):
        """Apply final optimizations like fairness constraints and preferences."""
        self._balance_tough_shifts()
    
    def _balance_tough_shifts(self):
        """Post-process to balance tough shifts between doctors by swapping assignments."""
        print("🔄 Balancing tough shift distribution...", file=sys.stderr)
        
        # Calculate penalty statistics
        doctor_penalties = [(name, workload['penalty_points']) for name, workload in self.doctor_workloads.items()]
        doctor_penalties.sort(key=lambda x: x[1])  # Sort by penalty points (low to high)
        
        if len(doctor_penalties) < 2:
            return
            
        # Identify doctors with high and low penalty loads
        total_penalty_points = sum(penalty for _, penalty in doctor_penalties)
        avg_penalty = total_penalty_points / len(doctor_penalties)
        
        high_penalty_doctors = [(name, penalty) for name, penalty in doctor_penalties if penalty > avg_penalty * 1.2]
        low_penalty_doctors = [(name, penalty) for name, penalty in doctor_penalties if penalty < avg_penalty * 0.8]
        
        print(f"   Avg penalty: {avg_penalty:.1f}, High penalty: {len(high_penalty_doctors)}, Low penalty: {len(low_penalty_doctors)}", file=sys.stderr)
        
        swaps_made = 0
        max_swaps = min(10, len(high_penalty_doctors) * 2)  # Limit swaps to prevent infinite loops
        
        for high_doctor, high_penalty in high_penalty_doctors:
            if swaps_made >= max_swaps:
                break
                
            for low_doctor, low_penalty in low_penalty_doctors:
                if swaps_made >= max_swaps:
                    break
                    
                # Try to find swappable shifts
                swap_found = self._try_swap_shifts_between_doctors(high_doctor, low_doctor)
                if swap_found:
                    swaps_made += 1
                    print(f"   ✅ Swapped tough shift: {high_doctor} ↔ {low_doctor}", file=sys.stderr)
        
        print(f"   Completed {swaps_made} tough shift swaps for better balance", file=sys.stderr)
    
    def _try_swap_shifts_between_doctors(self, high_penalty_doctor: str, low_penalty_doctor: str) -> bool:
        """Try to swap a high-penalty shift from high_doctor with a low-penalty shift from low_doctor."""
        high_assignments = self.assignments[high_penalty_doctor]
        low_assignments = self.assignments[low_penalty_doctor]
        
        # Find shifts that could be swapped (same type but different penalty levels)
        for high_date, high_shift_name in high_assignments.items():
            for low_date, low_shift_name in low_assignments.items():
                # Parse shift details
                high_shift = self._parse_shift_from_name(high_shift_name)
                low_shift = self._parse_shift_from_name(low_shift_name)
                
                if not high_shift or not low_shift:
                    continue
                
                # Calculate penalty difference
                high_is_friday = datetime.strptime(high_date, "%Y-%m-%d").weekday() == 4
                low_is_friday = datetime.strptime(low_date, "%Y-%m-%d").weekday() == 4
                
                high_penalty = high_shift.get_penalty_score(high_is_friday)
                low_penalty = low_shift.get_penalty_score(low_is_friday)
                
                # Only swap if high doctor's shift has significantly more penalty points
                if high_penalty > low_penalty + 1.0:  # At least 1 point difference
                    # Check if both doctors can work the other's shift
                    if (low_date not in self._get_doctor_by_name(high_penalty_doctor).unavailable_dates and
                        high_date not in self._get_doctor_by_name(low_penalty_doctor).unavailable_dates):
                        
                        # Perform the swap
                        self._swap_assignments(high_penalty_doctor, high_date, low_penalty_doctor, low_date)
                        return True
        
        return False
    
    def _parse_shift_from_name(self, shift_name: str) -> Optional[Shift]:
        """Parse shift details from shift name string."""
        try:
            parts = shift_name.split()
            if len(parts) < 3:
                return None
                
            site = parts[0]
            role = parts[1]  
            shift_type = parts[2]
            
            # Create shift object to calculate penalty
            return Shift(site=site, role=role, shift_type=shift_type, duration_hours=10.0)
        except:
            return None
    
    def _get_doctor_by_name(self, name: str) -> Optional[Doctor]:
        """Get doctor object by name."""
        return next((d for d in self.doctors if d.name == name), None)
    
    def _swap_assignments(self, doctor1: str, date1: str, doctor2: str, date2: str):
        """Swap shift assignments between two doctors on different dates."""
        # Store original assignments
        shift1 = self.assignments[doctor1][date1]
        shift2 = self.assignments[doctor2][date2]
        
        # Get shift objects for penalty recalculation
        shift1_obj = self._parse_shift_from_name(shift1)
        shift2_obj = self._parse_shift_from_name(shift2)
        
        if not shift1_obj or not shift2_obj:
            return
        
        # Calculate original penalties
        is_friday1 = datetime.strptime(date1, "%Y-%m-%d").weekday() == 4
        is_friday2 = datetime.strptime(date2, "%Y-%m-%d").weekday() == 4
        
        penalty1 = shift1_obj.get_penalty_score(is_friday1)
        penalty2 = shift2_obj.get_penalty_score(is_friday2)
        
        # Update assignments
        self.assignments[doctor1][date1] = shift2
        self.assignments[doctor2][date2] = shift1
        
        # Update penalty tracking
        self.doctor_workloads[doctor1]['penalty_points'] -= penalty1
        self.doctor_workloads[doctor1]['penalty_points'] += penalty2
        
        self.doctor_workloads[doctor2]['penalty_points'] -= penalty2  
        self.doctor_workloads[doctor2]['penalty_points'] += penalty1
    
    def _distribute_shifts_simply(self, clinical_shifts: List[tuple]):
        """Distribute shifts using simple round-robin with EFT awareness."""
        shifts_by_date = defaultdict(list)
        for date_str, shift in clinical_shifts:
            shifts_by_date[date_str].append(shift)
        
        sorted_dates = sorted(shifts_by_date.keys())
        
        for date_str in sorted_dates:
            daily_shifts = shifts_by_date[date_str]
            available_doctors = self._get_available_doctors_for_date(date_str)
            
            for shift in daily_shifts:
                best_doctor = self._find_best_doctor_for_shift(shift, date_str, available_doctors)
                if best_doctor:
                    self._assign_shift_to_doctor(best_doctor, date_str, shift)
    
    def _get_available_doctors_for_date(self, date_str: str) -> List[str]:
        """Get doctors available for assignment on a specific date."""
        available = []
        
        for doctor in self.doctors:
            workload = self.doctor_workloads[doctor.name]
            
            # Skip if doctor has reached EFT limit
            if workload['remaining_hours'] <= 0:
                continue
                
            # Skip if doctor is unavailable on this date
            if date_str in doctor.unavailable_dates:
                continue
            
            # Skip if doctor already has a shift this day
            if date_str in self.assignments[doctor.name]:
                continue
                
            available.append(doctor.name)
        
        # Sort by current workload for fair distribution
        available.sort(key=lambda name: self.doctor_workloads[name]['total_hours'])
        
        return available
    
    def _find_best_doctor_for_shift(self, shift: Shift, date_str: str, available_doctors: List[str]) -> Optional[str]:
        """Find the best doctor for a specific shift with improved tough shift distribution."""
        if not available_doctors:
            return None
        
        doctor_scores = []
        is_friday = datetime.strptime(date_str, "%Y-%m-%d").weekday() == 4
        shift_penalty = shift.get_penalty_score(is_friday)
        
        # Calculate average penalty points across all doctors to target fair distribution
        all_penalty_points = [self.doctor_workloads[doc.name]['penalty_points'] for doc in self.doctors]
        avg_penalty_points = sum(all_penalty_points) / len(all_penalty_points) if all_penalty_points else 0
        
        for doctor_name in available_doctors:
            doctor = next(d for d in self.doctors if d.name == doctor_name)
            workload = self.doctor_workloads[doctor_name]
            
            # Check if doctor has enough hours remaining
            if workload['remaining_hours'] < shift.duration_hours:
                continue
            
            score = 0
            
            # Base scoring: Prefer doctors with lower current workload
            score += (100 - workload['total_shifts']) * 2
            
            # Tough shift fairness: For shifts with penalty points, strongly prefer doctors with lower penalty accumulation
            if shift_penalty > 0:
                # Calculate how far below average this doctor's penalty points are
                penalty_diff = avg_penalty_points - workload['penalty_points']
                # Heavily weight penalty fairness (multiply by 5 to make it dominant factor)
                score += penalty_diff * 5
                
                # Additional boost for doctors who are significantly under-penalized
                if workload['penalty_points'] < avg_penalty_points * 0.8:
                    score += 20  # Extra boost for very under-penalized doctors
            
            # Consider site preference for Rosebud (but reduce weight vs penalty fairness)
            if shift.site == "Rosebud":
                rosebud_bonus = doctor.rosebud_preference * 8  # Reduced from 10
                score += rosebud_bonus
                
                # If doctor has negative Rosebud preference and this is a tough Rosebud shift,
                # don't completely rule them out if they need penalty points for fairness
                if doctor.rosebud_preference < 0 and shift_penalty > 2:
                    if workload['penalty_points'] < avg_penalty_points * 0.7:
                        score += 10  # Fairness override for very under-penalized doctors
            
            doctor_scores.append((doctor_name, score))
        
        if not doctor_scores:
            return None
        
        # Return best option (highest score = best choice)
        doctor_scores.sort(key=lambda x: x[1], reverse=True)
        return doctor_scores[0][0]
    
    def _assign_shift_to_doctor(self, doctor_name: str, date_str: str, shift: Shift):
        """Assign a shift to a doctor and update tracking."""
        shift_name = f"{shift.site} {shift.role} {shift.shift_type}"
        
        self.assignments[doctor_name][date_str] = shift_name
        
        workload = self.doctor_workloads[doctor_name]
        workload['total_hours'] += shift.duration_hours
        workload['total_shifts'] += 1
        workload['remaining_hours'] -= shift.duration_hours
        
        # Update clinical vs admin shift counters
        if "Admin" in shift_name:
            workload['current_admin_shifts'] += 1
        else:
            workload['current_clinical_shifts'] += 1
        
        if shift.is_undesirable:
            workload['undesirable_shifts'] += 1
        
        # Calculate and track penalty points for tough shift distribution
        is_friday = datetime.strptime(date_str, "%Y-%m-%d").weekday() == 4  # Friday is weekday 4
        penalty_points = shift.get_penalty_score(is_friday)
        workload['penalty_points'] += penalty_points
    
    def _add_non_clinical_shifts(self, start_date: datetime, num_weeks: int):
        """Add non-clinical (admin) shifts using predefined targets from initialization."""
        # Generate all dates for the period
        all_dates = []
        for week in range(num_weeks):
            week_start = start_date + timedelta(weeks=week)
            for day in range(7):
                current_date = week_start + timedelta(days=day)
                all_dates.append(current_date.strftime("%Y-%m-%d"))
        
        # Assign admin shifts using the targets set during initialization
        self._assign_admin_shifts_to_targets(all_dates)
    
    def _assign_admin_shifts_to_targets(self, all_dates: List[str]):
        """Assign admin shifts to reach each doctor's target admin shift count."""
        admin_shifts = self.shift_template.non_clinical_shifts
        
        # Multiple passes to ensure we fill admin quotas
        for pass_num in range(5):
            assignments_made = 0
            
            # Get doctors who need more admin shifts
            doctors_needing_admin = []
            for doctor_name, workload in self.doctor_workloads.items():
                target_admin = workload.get('target_admin_shifts', 0)
                current_admin = workload.get('current_admin_shifts', 0)
                
                if current_admin < target_admin and workload['remaining_hours'] >= 8:
                    priority = target_admin - current_admin
                    doctors_needing_admin.append((doctor_name, priority))
            
            # Sort by priority (most admin shifts needed first)
            doctors_needing_admin.sort(key=lambda x: x[1], reverse=True)
            
            if not doctors_needing_admin:
                break  # All doctors have reached their admin targets
            
            # Try to assign admin shifts to these doctors
            for date_str in all_dates:
                for shift in admin_shifts:
                    shift_name = f"{shift.site} {shift.role} {shift.shift_type}"
                    
                    # Check if this shift type is already assigned on this date
                    shift_taken = False
                    for doctor_name in self.assignments:
                        if date_str in self.assignments[doctor_name] and self.assignments[doctor_name][date_str] == shift_name:
                            shift_taken = True
                            break
                    
                    if not shift_taken:
                        # Find first available doctor who needs admin shifts
                        for doctor_name, priority in doctors_needing_admin:
                            if date_str not in self.assignments[doctor_name]:  # Doctor is free this day
                                workload = self.doctor_workloads[doctor_name]
                                if workload['remaining_hours'] >= shift.duration_hours:
                                    # Assign this shift
                                    self._assign_shift_to_doctor(doctor_name, date_str, shift)
                                    assignments_made += 1
                                    break
            
            if assignments_made == 0:
                break  # No more assignments possible
    
    def _calculate_target_admin_shifts_per_doctor(self):
        """Calculate target admin shifts for each doctor based on 3:1 clinical:admin ratio."""
        for doctor_name, workload in self.doctor_workloads.items():
            # Count current clinical shifts
            clinical_shifts = 0
            for date, shift_name in self.assignments[doctor_name].items():
                if "Admin" not in shift_name:
                    clinical_shifts += 1
            
            # Calculate target admin shifts to achieve 3:1 ratio
            # For every 3 clinical shifts, we want 1 admin shift
            if clinical_shifts == 0:
                target_admin_shifts = 0  # No clinical = no admin
            else:
                # Round up to ensure we get close to 3:1 (not too low)
                target_admin_shifts = max(1, round(clinical_shifts / 3.0))
                
                # For 7 clinical shifts, we want 2-3 admin (target closer to 3:1)
                if clinical_shifts == 7:
                    target_admin_shifts = 2  # 7:2 = 3.5:1 (acceptable)
                elif clinical_shifts == 6:
                    target_admin_shifts = 2  # 6:2 = 3:1 (perfect)
                elif clinical_shifts >= 9:
                    target_admin_shifts = 3  # 9:3 = 3:1 (perfect)
            
            # Store in workload for reference
            workload['target_admin_shifts'] = target_admin_shifts
            workload['current_admin_shifts'] = 0  # Will be updated as we assign
    
    def _assign_admin_shifts_with_ratio_constraints(self, all_dates: List[str]):
        """Assign admin shifts while respecting the 3:1 clinical to admin ratio."""
        admin_shifts = self.shift_template.non_clinical_shifts
        
        # Multiple passes to ensure we fill admin quotas properly
        max_passes = 5  # Increase passes to ensure all doctors get their admin shifts
        
        for pass_num in range(max_passes):
            assignments_made_this_pass = 0
            
            # For each date, try to assign admin shifts to doctors who need them most
            for date_str in all_dates:
                # Get doctors available on this date who need admin shifts
                available_doctors_for_admin = []
                
                for doctor_name in self.assignments:
                    if date_str not in self.assignments[doctor_name]:  # Doctor is free this day
                        workload = self.doctor_workloads[doctor_name]
                        target_admin = workload.get('target_admin_shifts', 0)
                        current_admin = workload.get('current_admin_shifts', 0)
                        
                        # Check if doctor needs more admin shifts and has remaining hours
                        if (current_admin < target_admin and 
                            workload['remaining_hours'] >= 8):  # 8 hours for admin shift
                            priority = target_admin - current_admin  # Higher priority = more admin shifts needed
                            available_doctors_for_admin.append((doctor_name, priority))
                
                # Sort by priority (doctors needing more admin shifts first)
                available_doctors_for_admin.sort(key=lambda x: x[1], reverse=True)
                
                # Assign admin shifts to available doctors with strict site balancing
                shifts_assigned_today = 0
                max_admin_shifts_per_day = min(12, len(available_doctors_for_admin))
                
                # Group admin shifts by site for better distribution
                frankston_admin_shifts = [s for s in admin_shifts if s.site == "Frankston"]
                rosebud_admin_shifts = [s for s in admin_shifts if s.site == "Rosebud"]
                
                # Create a balanced list that gives fair representation to both sites
                balanced_admin_shifts = []
                
                # Calculate how many from each site to ensure balance
                total_possible_assignments = min(max_admin_shifts_per_day, len(available_doctors_for_admin))
                
                # Ensure proper representation: Rosebud has 2/14 admin shifts, so should get ~2/14 of assignments
                # But ensure at least 1 Rosebud assignment if we're assigning multiple admin shifts
                rosebud_proportion = len(rosebud_admin_shifts) / len(admin_shifts)  # Should be 2/14 = ~0.14
                min_rosebud_assignments = 1 if total_possible_assignments >= 2 else 0  # At least 1 if assigning 2+
                max_rosebud_assignments = max(min_rosebud_assignments, int(total_possible_assignments * rosebud_proportion * 1.5))  # Give slightly more weight
                
                # Cap by available shifts
                rosebud_to_add = min(max_rosebud_assignments, len(rosebud_admin_shifts))
                frankston_to_add = min(len(frankston_admin_shifts), total_possible_assignments - rosebud_to_add)
                
                # Alternate adding shifts, starting with Rosebud to ensure representation
                rosebud_added = 0
                frankston_added = 0
                
                # Build the balanced list with proper prioritization
                # Add all Rosebud shifts first to ensure they get assigned
                for i in range(rosebud_to_add):
                    if i < len(rosebud_admin_shifts):
                        balanced_admin_shifts.append(rosebud_admin_shifts[i])
                        
                # Then add Frankston shifts
                for i in range(frankston_to_add):
                    if i < len(frankston_admin_shifts):
                        balanced_admin_shifts.append(frankston_admin_shifts[i])
                
                # Assign shifts using balanced list
                for shift in balanced_admin_shifts:
                    if shifts_assigned_today >= max_admin_shifts_per_day:
                        break
                        
                    # Find first available doctor for this shift type
                    for doctor_name, priority in available_doctors_for_admin:
                        if date_str not in self.assignments[doctor_name]:  # Still available
                            # Check if this exact shift type is already assigned to someone else today
                            shift_name = f"{shift.site} {shift.role} {shift.shift_type}"
                            shift_already_assigned_today = False
                            
                            for other_doctor in self.assignments:
                                if (date_str in self.assignments[other_doctor] and 
                                    self.assignments[other_doctor][date_str] == shift_name):
                                    shift_already_assigned_today = True
                                    break
                            
                            if not shift_already_assigned_today:
                                # Assign this admin shift to this doctor
                                self._assign_shift_to_doctor(doctor_name, date_str, shift)
                                self.doctor_workloads[doctor_name]['current_admin_shifts'] += 1
                                shifts_assigned_today += 1
                                assignments_made_this_pass += 1
                                
                                # Remove this doctor from available list for today
                                available_doctors_for_admin = [(d, p) for d, p in available_doctors_for_admin if d != doctor_name]
                                break
            
            # If no assignments were made in this pass, we're done
            if assignments_made_this_pass == 0:
                break
    
    def _assign_limited_admin_shifts_for_date(self, date_str: str, max_shifts: int):
        """Assign a limited number of admin shifts for a specific date. Returns actual number assigned."""
        admin_shifts = self.shift_template.non_clinical_shifts
        shifts_assigned = 0
        
        # Group admin shifts by site for better distribution
        frankston_admin_shifts = [s for s in admin_shifts if s.site == "Frankston"]
        rosebud_admin_shifts = [s for s in admin_shifts if s.site == "Rosebud"]
        
        # Create balanced list alternating between sites
        balanced_admin_shifts = []
        max_shifts_per_site = max(len(frankston_admin_shifts), len(rosebud_admin_shifts))
        
        for i in range(max_shifts_per_site):
            # Add Frankston shift if available
            if i < len(frankston_admin_shifts):
                balanced_admin_shifts.append(frankston_admin_shifts[i])
            # Add Rosebud shift if available
            if i < len(rosebud_admin_shifts):
                balanced_admin_shifts.append(rosebud_admin_shifts[i])
        
        # Sort balanced shifts by role for consistency
        admin_shifts_sorted = sorted(balanced_admin_shifts, key=lambda s: (s.site, s.role))
        
        for shift in admin_shifts_sorted:
            if shifts_assigned >= max_shifts:
                break
                
            available_doctors = []
            
            for doctor_name in self.assignments:
                if date_str not in self.assignments[doctor_name]:
                    workload = self.doctor_workloads[doctor_name]
                    if workload['remaining_hours'] >= shift.duration_hours:
                        available_doctors.append(doctor_name)
            
            if available_doctors:
                # Sort by remaining hours (descending) to prioritize doctors who need more admin work
                available_doctors.sort(key=lambda name: self.doctor_workloads[name]['remaining_hours'], reverse=True)
                chosen_doctor = available_doctors[0]
                self._assign_shift_to_doctor(chosen_doctor, date_str, shift)
                shifts_assigned += 1
        
        return shifts_assigned
    
    def _redistribute_admin_shifts(self, all_dates: List[str], daily_assignments: Dict[str, int], target_shifts_per_day: int):
        """Redistribute admin shifts to achieve better balance across all days."""
        # Find days that are under-assigned and could use more admin shifts
        under_assigned_days = []
        over_assigned_days = []
        
        for date_str in all_dates:
            actual_assignments = daily_assignments[date_str]
            if actual_assignments < target_shifts_per_day:
                under_assigned_days.append((date_str, target_shifts_per_day - actual_assignments))
            elif actual_assignments > target_shifts_per_day:
                over_assigned_days.append((date_str, actual_assignments - target_shifts_per_day))
        
        # Try to move some assignments from over-assigned days to under-assigned days
        for under_date, needed_shifts in under_assigned_days:
            shifts_to_add = min(needed_shifts, 3)  # Don't add too many at once
            
            # Try to assign additional shifts to this under-assigned day
            for _ in range(shifts_to_add):
                admin_shifts = self.shift_template.non_clinical_shifts
                
                # Find an available admin shift type not already assigned on this day
                for shift in admin_shifts:
                    # Check if this shift type is already assigned on this day
                    shift_already_assigned = False
                    for doctor_name in self.assignments:
                        if (under_date in self.assignments[doctor_name] and 
                            self.assignments[doctor_name][under_date] == f"{shift.site} {shift.role} {shift.shift_type}"):
                            shift_already_assigned = True
                            break
                    
                    if not shift_already_assigned:
                        # Try to find an available doctor for this shift
                        available_doctors = []
                        for doctor_name in self.assignments:
                            if under_date not in self.assignments[doctor_name]:
                                workload = self.doctor_workloads[doctor_name]
                                if workload['remaining_hours'] >= shift.duration_hours:
                                    available_doctors.append(doctor_name)
                        
                        if available_doctors:
                            # Sort by remaining hours (descending)
                            available_doctors.sort(key=lambda name: self.doctor_workloads[name]['remaining_hours'], reverse=True)
                            chosen_doctor = available_doctors[0]
                            self._assign_shift_to_doctor(chosen_doctor, under_date, shift)
                            break
    
    def _redistribute_remaining_admin_capacity(self, all_dates: List[str], target_shifts_per_day: int):
        """Distribute remaining admin capacity more evenly across all days."""
        # Work backwards through dates to prioritize later days
        for date_str in reversed(all_dates):
            current_admin_count = self._count_admin_shifts_for_date(date_str)
            
            # Try to add more admin shifts to days that have fewer than target
            while current_admin_count < target_shifts_per_day:
                admin_shifts = self.shift_template.non_clinical_shifts
                assigned_new_shift = False
                
                # Try each admin shift type
                for shift in admin_shifts:
                    shift_name = f"{shift.site} {shift.role} {shift.shift_type}"
                    
                    # Check if this shift type is already assigned on this day
                    shift_already_assigned = False
                    for doctor_name in self.assignments:
                        if (date_str in self.assignments[doctor_name] and 
                            self.assignments[doctor_name][date_str] == shift_name):
                            shift_already_assigned = True
                            break
                    
                    if not shift_already_assigned:
                        # Try to find an available doctor
                        available_doctors = []
                        for doctor_name in self.assignments:
                            if date_str not in self.assignments[doctor_name]:
                                workload = self.doctor_workloads[doctor_name]
                                if workload['remaining_hours'] >= shift.duration_hours:
                                    available_doctors.append(doctor_name)
                        
                        if available_doctors:
                            # Sort by remaining hours (descending)
                            available_doctors.sort(key=lambda name: self.doctor_workloads[name]['remaining_hours'], reverse=True)
                            chosen_doctor = available_doctors[0]
                            self._assign_shift_to_doctor(chosen_doctor, date_str, shift)
                            current_admin_count += 1
                            assigned_new_shift = True
                            break
                
                # If we couldn't assign any new shift, break out of the while loop
                if not assigned_new_shift:
                    break
    
    def _count_admin_shifts_for_date(self, date_str: str) -> int:
        """Count the number of admin shifts already assigned for a specific date."""
        admin_count = 0
        for doctor_name in self.assignments:
            if date_str in self.assignments[doctor_name]:
                shift_name = self.assignments[doctor_name][date_str]
                if "Admin" in shift_name:
                    admin_count += 1
        return admin_count
    
    def _assign_admin_shifts_for_date(self, date_str: str):
        """Assign admin shifts for a specific date (legacy method)."""
        admin_shifts = self.shift_template.non_clinical_shifts
        
        for shift in admin_shifts:
            available_doctors = []
            
            for doctor_name in self.assignments:
                if date_str not in self.assignments[doctor_name]:
                    workload = self.doctor_workloads[doctor_name]
                    if workload['remaining_hours'] >= shift.duration_hours:
                        available_doctors.append(doctor_name)
            
            if available_doctors:
                available_doctors.sort(key=lambda name: self.doctor_workloads[name]['total_hours'])
                chosen_doctor = available_doctors[0]
                self._assign_shift_to_doctor(chosen_doctor, date_str, shift)
    
    def _apply_constraint_satisfaction(self):
        """Apply constraint satisfaction to improve the roster."""
        # Basic undesirable shift balancing
        undesirable_counts = {name: workload['undesirable_shifts'] 
                            for name, workload in self.doctor_workloads.items()}
        
        if undesirable_counts:
            max_undesirable = max(undesirable_counts.values())
            min_undesirable = min(undesirable_counts.values())
            return max_undesirable - min_undesirable <= 1
        
        return True


# ===========================
# CSV OUTPUT GENERATORS
# ===========================

def generate_calendar_view_csv(assignments: Dict, start_date: datetime, num_weeks: int) -> str:
    """Generate calendar view CSV string."""
    # Get all unique clinical shifts
    all_shifts = set()
    for doctor_assignments in assignments.values():
        if isinstance(doctor_assignments, dict):
            for shift_name in doctor_assignments.values():
                all_shifts.add(shift_name)
    
    # Sort shifts with clinical first, then non-clinical (Admin)
    clinical_shifts = [s for s in all_shifts if "Admin" not in s]
    non_clinical_shifts = [s for s in all_shifts if "Admin" in s]
    all_shifts = sorted(clinical_shifts) + sorted(non_clinical_shifts)
    
    # Generate date range
    dates = []
    for week in range(num_weeks):
        for day in range(7):
            current_date = start_date + timedelta(weeks=week, days=day)
            dates.append(current_date.strftime("%Y-%m-%d"))
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Date"] + all_shifts)
    
    # Data rows
    for date_str in dates:
        row = [date_str]
        
        for shift_name in all_shifts:
            assigned_doctor = "VACANT"
            for doctor_name, doctor_assignments in assignments.items():
                if date_str in doctor_assignments and doctor_assignments[date_str] == shift_name:
                    assigned_doctor = doctor_name
                    break
            
            row.append(assigned_doctor)
        
        writer.writerow(row)
    
    return output.getvalue()


def generate_doctor_view_csv(assignments: Dict, start_date: datetime, num_weeks: int) -> str:
    """Generate doctor view CSV string."""
    dates = []
    for week in range(num_weeks):
        for day in range(7):
            current_date = start_date + timedelta(weeks=week, days=day)
            dates.append(current_date.strftime("%Y-%m-%d"))
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    doctor_names = sorted(assignments.keys())
    writer.writerow(["Date"] + doctor_names)
    
    # Data rows
    for date_str in dates:
        row = [date_str]
        
        for doctor_name in doctor_names:
            shift = assignments[doctor_name].get(date_str, "OFF")
            row.append(shift)
        
        writer.writerow(row)
    
    return output.getvalue()


def generate_doctor_summary_csv(doctors: List[Doctor], workloads: Dict, assignments: Dict) -> str:
    """Generate doctor summary CSV string."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    headers = [
        "Doctor_Name", "EFT", "Total_Hours", "Max_Hours", "EFT_Utilization_%",
        "Total_Shifts", "Undesirable_Shifts", "Clinical_Shifts", "Admin_Shifts", "Remaining_Hours"
    ]
    writer.writerow(headers)
    
    # Data rows
    for doctor in doctors:
        workload = workloads[doctor.name]
        utilization = (workload['total_hours'] / workload['max_hours']) * 100 if workload['max_hours'] > 0 else 0
        
        doctor_assignments = assignments[doctor.name]
        clinical_shifts = sum(1 for shift in doctor_assignments.values() if not ("Admin" in shift))
        admin_shifts = sum(1 for shift in doctor_assignments.values() if "Admin" in shift)
        
        row = [
            doctor.name, f"{doctor.eft:.2f}", f"{workload['total_hours']:.1f}",
            f"{workload['max_hours']:.1f}", f"{utilization:.1f}",
            str(workload['total_shifts']), str(workload['undesirable_shifts']),
            str(clinical_shifts), str(admin_shifts), f"{workload['remaining_hours']:.1f}"
        ]
        writer.writerow(row)
    
    return output.getvalue()


# ===========================
# MAIN FUNCTION FOR NODE.JS
# ===========================

def load_doctors_from_config(config_path: str) -> List[Doctor]:
    """Load doctors from the existing config.json structure."""
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    doctors = []
    for name, doctor_config in config.get("DOCTORS", {}).items():
        if name.startswith("_"):  # Skip metadata
            continue
            
        doctor = Doctor(
            name=name,
            eft=doctor_config["eft"],
            rosebud_preference=doctor_config.get("rosebud_preference", 0),
            unavailable_dates=doctor_config.get("unavailable_dates", []),
            email=doctor_config.get("email", ""),
            phone=doctor_config.get("phone", ""),
            specialization=doctor_config.get("specialization", ""),
            status=doctor_config.get("status", "active")
        )
        doctors.append(doctor)
    
    return doctors


def main():
    """Main function called by Node.js backend."""
    try:
        # Parse command line arguments
        if len(sys.argv) < 4:
            print("Usage: python roster_generator.py <config_path> <weeks> <start_date>", file=sys.stderr)
            sys.exit(1)
        
        config_path = sys.argv[1]
        weeks = int(sys.argv[2])
        start_date_str = sys.argv[3]
        
        # Parse start date
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        
        # Load doctors and generate roster
        doctors = load_doctors_from_config(config_path)
        scheduler = SimpleScheduler(doctors)
        
        success = scheduler.generate_roster(start_date, weeks)
        
        if not success:
            print("Roster generation failed", file=sys.stderr)
            sys.exit(1)
        
        # Generate outputs
        assignments = scheduler.assignments
        workloads = scheduler.doctor_workloads
        
        outputs = {
            "calendar_view": generate_calendar_view_csv(assignments, start_date, weeks),
            "doctor_view": generate_doctor_view_csv(assignments, start_date, weeks),
            "doctor_summary": generate_doctor_summary_csv(doctors, workloads, assignments)
        }
        
        # Calculate statistics
        statistics = {
            "total_doctors": len(doctors),
            "total_shifts": sum(w['total_shifts'] for w in workloads.values()),
            "total_hours": sum(w['total_hours'] for w in workloads.values()),
            "avg_eft_utilization": sum((w['total_hours'] / w['max_hours']) * 100 
                                     for w in workloads.values()) / len(doctors) if doctors else 0
        }
        
        # Return JSON result for Node.js
        result = {
            "success": True,
            "statistics": statistics,
            "outputs": outputs
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()