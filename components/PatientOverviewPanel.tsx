import React, { useState } from 'react';
import { User, Activity, FileText, X, Heart, Sparkles, Trash2, Calendar, Shield } from 'lucide-react';
import { Language } from '../types';

interface PatientOverviewPanelProps {
  patient: any;
  appLanguage: Language;
  onClear: () => void;
}

export const PatientOverviewPanel: React.FC<PatientOverviewPanelProps> = ({
  patient,
  appLanguage,
  onClear,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!patient) return null;

  const isEn = appLanguage === Language.ENGLISH;

  const tongueInfo = patient.tongue || {};
  const pulseInfo = patient.pulse || {};

  // Parse tongue features
  const tongueFeaturesStr = Array.isArray(tongueInfo.special_features)
    ? tongueInfo.special_features.join(', ')
    : tongueInfo.special_features || '';

  // Parse pulse qualities
  const pulseQualitiesStr = Array.isArray(pulseInfo.qualities)
    ? pulseInfo.qualities.join(', ')
    : pulseInfo.qualities || '';

  return (
    <div className="w-full bg-gradient-to-br from-white to-purple-50/20 border border-purple-100 rounded-3xl p-5 shadow-xl animate-fade-in relative overflow-hidden transition-all duration-300">
      {/* Decorative Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/30 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-purple-500/10">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-purple-950 uppercase tracking-tight">
                {patient.patientName || (isEn ? 'Unnamed Patient' : 'Pasien Tanpa Nama')}
              </h4>
              <span className="px-2 py-0.5 bg-purple-100 border border-purple-200 rounded-full text-[9px] font-black text-purple-600 uppercase tracking-wider">
                {isEn ? 'Active Record' : 'Rekam Medis Aktif'}
              </span>
            </div>
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mt-0.5 flex flex-wrap gap-x-2">
              <span>{isEn ? 'Age' : 'Usia'}: {patient.age || '-'}</span>
              <span className="text-purple-300">•</span>
              <span>{isEn ? 'Sex' : 'Gender'}: {patient.sex === 'male' ? (isEn ? 'Male' : 'Laki-laki') : (isEn ? 'Female' : 'Perempuan')}</span>
              {patient.phone && (
                <>
                  <span className="text-purple-300">•</span>
                  <span>{patient.phone}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border border-purple-100"
          >
            {isCollapsed ? (isEn ? 'Show Summary' : 'Tampilkan Ringkasan') : (isEn ? 'Hide' : 'Sembunyikan')}
          </button>
          <button
            onClick={onClear}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition-all active:scale-95 border border-rose-100"
            title={isEn ? 'Close Patient Session' : 'Tutup Sesi Pasien'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Indicators section */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* INDICATOR 1: PRIMARY SYMPTOM */}
          <div className="bg-purple-50/50 hover:bg-purple-50 border border-purple-100/60 p-4 rounded-2xl transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-800 font-black text-[10px] uppercase tracking-widest mb-2.5">
                <FileText className="w-4 h-4 text-purple-600" />
                {isEn ? '1. Primary Symptom' : '1. Keluhan Utama'}
              </div>
              <p className="text-xs font-bold text-purple-950 leading-relaxed bg-white border border-purple-100/40 p-2.5 rounded-xl min-h-[50px] shadow-sm">
                {patient.complaint || (isEn ? 'No primary symptom specified.' : 'Tidak ada keluhan utama yang dicantumkan.')}
              </p>
            </div>
            {patient.selectedSymptoms && patient.selectedSymptoms.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-purple-100/40">
                <div className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-1.5">
                  {isEn ? 'Associated Symptoms' : 'Gejala Terkait'}
                </div>
                <div className="flex flex-wrap gap-1 max-h-[48px] overflow-y-auto pr-1">
                  {patient.selectedSymptoms.map((sym: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-white border border-purple-100 rounded-md text-[9px] font-bold text-purple-600 whitespace-nowrap"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* INDICATOR 2: TONGUE SIGNATURE */}
          <div className="bg-purple-50/50 hover:bg-purple-50 border border-purple-100/60 p-4 rounded-2xl transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-800 font-black text-[10px] uppercase tracking-widest mb-2.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                {isEn ? '2. Tongue Signature' : '2. Karakteristik Lidah'}
              </div>
              
              <div className="space-y-1.5 text-xs text-purple-950 font-semibold bg-white border border-purple-100/40 p-2.5 rounded-xl shadow-sm min-h-[50px]">
                <div className="flex justify-between border-b border-purple-100/20 pb-1">
                  <span className="text-[10px] text-purple-400 font-bold uppercase">{isEn ? 'Body' : 'Tubuh'}</span>
                  <span className="font-black text-purple-900">{tongueInfo.body_color || 'Normal'}</span>
                </div>
                <div className="flex justify-between border-b border-purple-100/20 pb-1">
                  <span className="text-[10px] text-purple-400 font-bold uppercase">{isEn ? 'Coating' : 'Selaput'}</span>
                  <span className="font-black text-purple-900">
                    {tongueInfo.coating_color || 'White'} ({tongueInfo.coating_quality || 'Thin'})
                  </span>
                </div>
              </div>
            </div>

            {tongueFeaturesStr && (
              <div className="mt-3 pt-2.5 border-t border-purple-100/40">
                <div className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-1">
                  {isEn ? 'Special Features' : 'Kondisi Khusus'}
                </div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block truncate">
                  {tongueFeaturesStr}
                </span>
              </div>
            )}
          </div>

          {/* INDICATOR 3: PULSE SIGNATURE */}
          <div className="bg-purple-50/50 hover:bg-purple-50 border border-purple-100/60 p-4 rounded-2xl transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-800 font-black text-[10px] uppercase tracking-widest mb-2.5">
                <Heart className="w-4 h-4 text-purple-600" />
                {isEn ? '3. Pulse Qualities' : '3. Kondisi Nadi'}
              </div>

              <div className="space-y-1 bg-white border border-purple-100/40 p-2.5 rounded-xl shadow-sm min-h-[50px] flex flex-col justify-center">
                {pulseQualitiesStr ? (
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(pulseInfo.qualities) ? pulseInfo.qualities : [pulseQualitiesStr]).map((q: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-black uppercase text-[9px] tracking-wider rounded-lg"
                      >
                        {q}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-purple-400 font-bold italic text-center">
                    {isEn ? 'No specific qualities' : 'Tidak ada karakteristik khusus'}
                  </span>
                )}
              </div>
            </div>

            {patient.medicalHistory && (
              <div className="mt-3 pt-2.5 border-t border-purple-100/40">
                <div className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-1">
                  {isEn ? 'Medical History' : 'Riwayat Penyakit'}
                </div>
                <p className="text-[10px] font-bold text-purple-700 truncate">
                  {patient.medicalHistory}
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
