// src/utils/calendarHelper.js
export const openGoogleCalendarEvent = (task) => {
    if (!task.eventDate) return;

    // Format Title and Details
    const text = encodeURIComponent(task.title);
    const details = encodeURIComponent(task.description || "Task from Dashboard");
    
    // Format Date (YYYYMMDDTHHmmssZ) - Assuming 1 hour duration by default
    const startDate = new Date(task.eventDate);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 Hour

    const formatTime = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const dates = `${formatTime(startDate)}/${formatTime(endDate)}`;

    // Generate URL
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;

    // Open in new tab
    window.open(url, '_blank');
};