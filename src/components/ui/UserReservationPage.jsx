"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase";
import { ref, push, set, serverTimestamp, get } from "firebase/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UserReservationPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [reservationForm, setReservationForm] = useState({
    name: "",
    dadAndGrandDad: "",
    tribe: "",
    weddingPlace: "",
    quranReading: "",
    artOnUs: "",
    email: "",
    phone: "",
    phone2: "",
  });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [dateLimits, setDateLimits] = useState({});
  const [reservations, setReservations] = useState({});
  const [nonWorkingDays, setNonWorkingDays] = useState([]);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  const weekDays = [
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  useEffect(() => {
    const fetchData = async () => {
      const reservationsRef = ref(db, "reservations");
      const dateLimitsRef = ref(db, "dateLimits");
      const nonWorkingDaysRef = ref(db, "nonWorkingDays");

      try {
        const [
          reservationsSnapshot,
          dateLimitsSnapshot,
          nonWorkingDaysSnapshot,
        ] = await Promise.all([
          get(reservationsRef),
          get(dateLimitsRef),
          get(nonWorkingDaysRef),
        ]);

        const reservationsData = reservationsSnapshot.val() || {};
        const formattedReservations = {};
        Object.values(reservationsData).forEach((reservation) => {
          const dateStr = reservation.date;
          if (!formattedReservations[dateStr]) {
            formattedReservations[dateStr] = [];
          }
          formattedReservations[dateStr].push(reservation);
        });

        setReservations(formattedReservations);
        setDateLimits(dateLimitsSnapshot.val() || {});
        setNonWorkingDays(
          nonWorkingDaysSnapshot.val()
            ? Object.keys(nonWorkingDaysSnapshot.val())
            : []
        );
      } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
      }
    };

    fetchData();
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReservationForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setReservationForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitReservation = async () => {
    if (!selectedDate) {
      setSubmissionStatus("الرجاء اختيار تاريخ");
      return;
    }

    const dateStr = selectedDate.toISOString().split("T")[0];
    const dayLimit = dateLimits[dateStr] || 7;
    const existingReservations = reservations[dateStr] || [];

    if (nonWorkingDays.includes(dateStr)) {
      setSubmissionStatus("هذا اليوم غير متاح للحجوزات");
      return;
    }

    if (existingReservations.length >= dayLimit) {
      setSubmissionStatus("هذا اليوم ممتلئ بالكامل");
      return;
    }

    if (!reservationForm.name || !reservationForm.email) {
      setSubmissionStatus("الاسم والبريد الإلكتروني مطلوبان");
      return;
    }

    try {
      const reservationRef = ref(db, "reservations");
      const newReservationRef = push(reservationRef);
      await set(newReservationRef, {
        ...reservationForm,
        date: dateStr,
        createdAt: serverTimestamp(),
        confirmed: false,
      });

      // Show success dialog and reset form
      setShowSuccessDialog(true);
      setSubmissionStatus(null);
      setReservationForm({
        name: "",
        email: "",
        phone: "",
      });
      setSelectedDate(null);

      // Hide success dialog after 4 seconds
      setTimeout(() => {
        setShowSuccessDialog(false);
      }, 4000);
    } catch (error) {
      console.error("خطأ في إرسال الحجز:", error);
      setSubmissionStatus(`خطأ في إرسال الحجز: ${error.message}`);
    }
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  return (
    <>
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-green-600">
              تم إرسال الحجز بنجاح! 🎉
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3 text-center">
            <DialogDescription asChild>
              <div>
                <div className="mb-2">
                  شكرًا لتسجيل حجزك. سنقوم بمراجعته وإرسال تأكيد عبر البريد
                  الإلكتروني قريبًا.
                </div>
                <div className="text-sm text-muted-foreground">
                  الرجاء التحقق من بريدك الإلكتروني للحصول على التعليمات
                  اللاحقة.
                </div>
              </div>
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
      <Card className="max-w-4xl mx-auto text-right rtl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>إجراء حجز</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setCurrentDate(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                )
              }
            >
              &gt;
            </Button>
            <span className="py-2 px-4 font-medium">
              {currentDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentDate(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                )
              }
            >
              &lt;
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="text-center font-medium p-2">
                {day}
              </div>
            ))}
            {days.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} className="p-4" />;

              const dateStr = date.toISOString().split("T")[0];
              const dayLimit = dateLimits[dateStr] || 7;
              const dateReservations = reservations[dateStr] || [];
              const isFull = dateReservations.length >= dayLimit;
              const isNonWorking = nonWorkingDays.includes(dateStr);
              const isPastDay = date < today;
              const isDisabled = isFull || isNonWorking || isPastDay;

              return (
                <Button
                  key={date.getTime()}
                  variant="outline"
                  disabled={isDisabled}
                  className={`h-24 p-2 relative 
                  ${
                    isDisabled
                      ? "bg-gray-200 opacity-50 cursor-not-allowed"
                      : ""
                  } 
                  ${
                    selectedDate?.toISOString().split("T")[0] === dateStr
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                  onClick={() => !isPastDay && setSelectedDate(date)}
                >
                  <div className="absolute top-1 right-1">{date.getDate()}</div>

                  {isNonWorking && (
                    <div className="absolute top-1/2 right-1/2 transform translate-x-1/2 -translate-y-1/2 text-xs text-gray-500">
                      غير متاح
                    </div>
                  )}
                </Button>
              );
            })}
          </div>

          {selectedDate && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>
                  تسجيل عرس ليوم {selectedDate.toLocaleDateString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissionStatus && (
                  <div
                    className={`mb-4 p-2 rounded ${
                      submissionStatus.includes("successfully")
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {submissionStatus}
                  </div>
                )}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>إسم ولقب العريس</Label>
                      <Input
                        type="text"
                        id="name"
                        name="name"
                        placeholder="أدخل إسم ولقب العريس هنا"
                        value={reservationForm.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>اسم الأب والجد</Label>
                      <Input
                        name="dadAndGrandDad"
                        placeholder="أدخل اسم الأب والجد"
                        value={reservationForm.dadAndGrandDad}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>العشيرة</Label>
                      <Input
                        name="tribe"
                        placeholder="أدخل اسم العشيرة"
                        value={reservationForm.tribe}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>مكان العرس</Label>
                      <Input
                        name="weddingPlace"
                        placeholder="أدخل مكان العرس"
                        value={reservationForm.weddingPlace}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>قراءة القرآن</Label>
                      <Select
                        onValueChange={(value) =>
                          handleSelectChange("quranReading", value)
                        }
                        value={reservationForm.quranReading}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder="اختر طريقة القراءة"
                            className={
                              !reservationForm.quranReading
                                ? "text-gray-400"
                                : "text-black"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="جماعي">جماعي</SelectItem>
                          <SelectItem value="فردي">فردي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>هل الجمعية الفنية على عاتق الجمعية</Label>
                      <Select
                        onValueChange={(value) =>
                          handleSelectChange("artOnUs", value)
                        }
                        value={reservationForm.artOnUs}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder="اختر"
                            className={
                              !reservationForm.artOnUs
                                ? "text-gray-400"
                                : "text-black"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="نعم">نعم</SelectItem>
                          <SelectItem value="لا">لا</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>الهاتف</Label>
                      <Input
                        name="phone"
                        type="tel"
                        placeholder="أدخل رقم الهاتف"
                        value={reservationForm.phone}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>الهاتف الثاني</Label>
                      <Input
                        name="phone2"
                        type="tel"
                        placeholder="أدخل رقم الهاتف الثاني (اختياري)"
                        value={reservationForm.phone2}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <Button onClick={submitReservation} className="w-full mt-4">
                    إرسال الحجز
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default UserReservationPage;
