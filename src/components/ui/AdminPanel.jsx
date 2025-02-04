"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Check, Trash, Search, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ref, onValue, update, remove, set } from "firebase/database";
import { db } from "@/lib/firebase";
import * as XLSX from 'xlsx';

const AdminPanel = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [reservations, setReservations] = useState({});
  const [nonWorkingDays, setNonWorkingDays] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [dateLimits, setDateLimits] = useState({});
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const downloadExcel = () => {
    if (!exportDateRange.startDate || !exportDateRange.endDate) {
      alert('الرجاء تحديد تاريخي البداية والنهاية');
      return;
    }

    const startDate = new Date(exportDateRange.startDate);
    const endDate = new Date(exportDateRange.endDate);

    if (startDate > endDate) {
      alert('يجب أن يكون تاريخ البداية قبل تاريخ النهاية');
      return;
    }

    const exportData = Object.entries(reservations)
      .filter(([date]) => {
        const reservationDate = new Date(date);
        return reservationDate >= startDate && reservationDate <= endDate;
      })
      .flatMap(([date, dateReservations]) => 
        dateReservations
          .filter(reservation => reservation.confirmed)
          .map(reservation => ({
            التاريخ: new Date(date).toLocaleDateString(),
            الاسم: reservation.name,
            الهاتف: reservation.phone || 'غير متوفر',
           'حالة التأكيد': reservation.confirmed ? 'مؤكد' : 'قيد الانتظار'
          }))
      );

    if (exportData.length === 0) {
      alert('لا توجد حجوزات مؤكدة في النطاق الزمني المحدد');
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    XLSX.utils.book_append_sheet(wb, ws, 'الحجوزات المؤكدة');

    const fileName = `الحجوزات-المؤكدة-${exportDateRange.startDate}-إلى-${exportDateRange.endDate}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  useEffect(() => {
    const reservationsRef = ref(db, "reservations");
    const dateLimitsRef = ref(db, "dateLimits");
    const nonWorkingDaysRef = ref(db, "nonWorkingDays");

    const unsubscribeReservations = onValue(reservationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const formattedReservations = {};
        Object.entries(data || {}).forEach(([id, reservation]) => {
          const dateStr = reservation.date;
          if (!formattedReservations[dateStr]) {
            formattedReservations[dateStr] = [];
          }
          formattedReservations[dateStr].push({ id, ...reservation });
        });
        setReservations(formattedReservations);
      } else {
        setReservations({});
      }
    });

    const unsubscribeDateLimits = onValue(dateLimitsRef, (snapshot) => {
      if (snapshot.exists()) {
        setDateLimits(snapshot.val());
      } else {
        setDateLimits({});
      }
    });

    const unsubscribeNonWorkingDays = onValue(nonWorkingDaysRef, (snapshot) => {
      if (snapshot.exists()) {
        setNonWorkingDays(Object.keys(snapshot.val()));
      } else {
        setNonWorkingDays([]);
      }
    });

    return () => {
      unsubscribeReservations();
      unsubscribeDateLimits();
      unsubscribeNonWorkingDays();
    };
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

  const confirmReservation = (dateStr, reservationId) => {
    const reservationRef = ref(db, `reservations/${reservationId}`);
    update(reservationRef, { confirmed: true });
  };

  const removeReservation = (dateStr, reservationId) => {
    const reservationRef = ref(db, `reservations/${reservationId}`);
    remove(reservationRef);
  };

  const toggleNonWorkingDay = (dateStr) => {
    const nonWorkingDayRef = ref(db, `nonWorkingDays/${dateStr}`);
    if (nonWorkingDays.includes(dateStr)) {
      remove(nonWorkingDayRef);
    } else {
      set(nonWorkingDayRef, true);
    }
  };

  const setCustomLimit = (dateStr, limit) => {
    const parsedLimit = parseInt(limit) || 7;
    const dateLimitRef = ref(db, `dateLimits/${dateStr}`);
    set(dateLimitRef, parsedLimit);
  };

  const handleSearch = () => {
    const results = [];
    Object.entries(reservations).forEach(([date, dateReservations]) => {
      dateReservations.forEach(reservation => {
        if (
          reservation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (reservation.phone && reservation.phone.includes(searchTerm))
        ) {
          results.push({ ...reservation, date });
        }
      });
    });
    setSearchResults(results);
  };

  const getStats = () => {
    let totalReservations = 0;
    let confirmedReservations = 0;
    let pendingReservations = 0;

    Object.values(reservations).forEach(dateReservations => {
      totalReservations += dateReservations.length;
      confirmedReservations += dateReservations.filter(r => r.confirmed).length;
      pendingReservations += dateReservations.filter(r => !r.confirmed).length;
    });

    return {
      totalReservations,
      confirmedReservations,
      pendingReservations,
      nonWorkingDays: nonWorkingDays.length
    };
  };

  const days = getDaysInMonth(currentDate);

  return (
    <Tabs defaultValue="calendar" className="max-w-6xl mx-auto">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="calendar">عرض التقويم</TabsTrigger>
        <TabsTrigger value="search">بحث الحجوزات</TabsTrigger>
        <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
      </TabsList>

      <TabsContent value="calendar">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>تقويم الحجوزات</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentDate(prev => 
                new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
              )}>&lt;</Button>
              <span className="py-2 px-4 font-medium">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="outline" onClick={() => setCurrentDate(prev => 
                new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
              )}>&gt;</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(day => (
                <div key={day} className="text-center font-medium p-2">{day}</div>
              ))}
              {days.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} className="p-4" />;
                
                const dateStr = date.toISOString().split('T')[0];
                const dayLimit = dateLimits[dateStr] || 7;
                const dateReservations = reservations[dateStr] || [];
                const isFull = dateReservations.length >= dayLimit;
                const isNonWorking = nonWorkingDays.includes(dateStr);
                
                return (
                  <Button
                    key={date.getTime()}
                    variant="outline"
                    className={`h-24 p-2 relative 
                      ${selectedDate?.toISOString().split('T')[0] === dateStr ? 'ring-2 ring-primary' : ''}
                      ${isNonWorking ? 'bg-gray-200' : ''}`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className="absolute top-1 left-1">{date.getDate()}</div>
                    {dateReservations.length > 0 && (
                      <div className="absolute bottom-1 right-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs">{dateReservations.length}/{dayLimit}</span>
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    {selectedDate.toLocaleDateString()}
                  </h3>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="حد الحجز"
                      className="w-32"
                      value={dateLimits[selectedDate.toISOString().split('T')[0]] || 7}
                      onChange={(e) => setCustomLimit(
                        selectedDate.toISOString().split('T')[0],
                        e.target.value
                      )}
                      min="0"
                      max="7"
                    />
                    <Button
                      variant="outline"
                      onClick={() => toggleNonWorkingDay(selectedDate.toISOString().split('T')[0])}
                    >
                      {nonWorkingDays.includes(selectedDate.toISOString().split('T')[0])
                        ? 'تعيين كيوم عمل'
                        : 'تعيين كيوم إجازة'}
                    </Button>
                  </div>
                </div>

                {(reservations[selectedDate.toISOString().split('T')[0]] || []).map(reservation => (
                  <Card key={reservation.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{reservation.name}</p>
                        {reservation.phone && (
                          <p className="text-sm text-gray-500">{reservation.phone}</p>
                        )}
                        <p className="text-sm text-gray-500">
                          الحالة: {reservation.confirmed ? 'مؤكد' : 'قيد الانتظار'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!reservation.confirmed && (
                          <Button
                            size="sm"
                            onClick={() => confirmReservation(
                              selectedDate.toISOString().split('T')[0],
                              reservation.id
                            )}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {reservation.confirmed ? (
                          <Button size="sm" variant="ghost" disabled>
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeReservation(
                              selectedDate.toISOString().split('T')[0],
                              reservation.id
                            )}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="search">
        <Card>
          <CardHeader>
            <CardTitle>بحث الحجوزات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="ابحث بالاسم أو الهاتف"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                بحث
              </Button>
            </div>
            <div className="space-y-4">
              {searchResults.map(result => (
                <Card key={result.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{result.name}</p>
                      {result.phone && (
                        <p className="text-sm text-gray-500">{result.phone}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        التاريخ: {new Date(result.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        الحالة: {result.confirmed ? 'مؤكد' : 'قيد الانتظار'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!result.confirmed && (
                        <Button
                          size="sm"
                          onClick={() => confirmReservation(result.date, result.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {result.confirmed ? (
                        <Button size="sm" variant="ghost" disabled>
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeReservation(result.date, result.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="stats">
        <Card>
          <CardHeader>
            <CardTitle>نظرة عامة على الإحصائيات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(getStats()).map(([key, value]) => (
                <Card key={key}>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">
                      {key === 'totalReservations' && 'إجمالي الحجوزات'}
                      {key === 'confirmedReservations' && 'الحجوزات المؤكدة'}
                      {key === 'pendingReservations' && 'الحجوزات قيد الانتظار'}
                      {key === 'nonWorkingDays' && 'أيام الإجازة'}
                    </p>
                    <p className="text-2xl font-bold">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">تصدير الحجوزات المؤكدة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">تاريخ البداية</label>
                      <Input 
                        type="date"
                        value={exportDateRange.startDate}
                        onChange={(e) => setExportDateRange(prev => ({
                          ...prev,
                          startDate: e.target.value
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">تاريخ النهاية</label>
                      <Input 
                        type="date"
                        value={exportDateRange.endDate}
                        onChange={(e) => setExportDateRange(prev => ({
                          ...prev,
                          endDate: e.target.value
                        }))}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={downloadExcel}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    تحميل تقرير Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
        
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">الحجوزات قيد الانتظار</h3>
              {Object.entries(reservations).flatMap(([date, dateReservations]) => 
                dateReservations
                  .filter(reservation => !reservation.confirmed)
                  .map(reservation => (
                    <Card key={reservation.id} className="mb-2">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{reservation.name}</p>
                          {reservation.phone && (
                            <p className="text-sm text-gray-500">{reservation.phone}</p>
                          )}
                          <p className="text-sm text-gray-500">Date: {date}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => confirmReservation(date, reservation.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeReservation(date, reservation.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                {Object.entries(reservations).every(([_, dateReservations]) => 
                    dateReservations.every(reservation => reservation.confirmed)
                ) && (
                    <p className="text-center text-gray-500 mt-4">
                    No pending reservations
                    </p>
                )}
                </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
export default AdminPanel;