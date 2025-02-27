import { createEvent, DateArray, Person } from "ics";

import dayjs from "@calcom/dayjs";
import { getRichDescription } from "@calcom/lib/CalEventParser";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { renderEmail } from "..";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerRequestedToRescheduleEmail extends OrganizerScheduledEmail {
  private metadata: { rescheduleLink: string };
  constructor(calEvent: CalendarEvent, metadata: { rescheduleLink: string }) {
    super(calEvent);
    this.metadata = metadata;
  }
  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = [this.calEvent.organizer.email];

    return {
      icalEvent: {
        filename: "event.ics",
        content: this.getiCalEventAsString(),
      },
      from: `ODL Bookings <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: `${this.t("rescheduled_event_type_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.attendees[0].name,
        date: this.getFormattedDate(),
      })}`,
      html: renderEmail("OrganizerRequestedToRescheduleEmail", {
        calEvent: this.calEvent,
        attendee: this.calEvent.organizer,
      }),
      text: this.getTextBody(
        this.t("request_reschedule_title_organizer", {
          attendee: this.calEvent.attendees[0].name,
        }),
        this.t("request_reschedule_subtitle_organizer", {
          attendee: this.calEvent.attendees[0].name,
        })
      ),
    };
  }

  // @OVERRIDE
  protected getiCalEventAsString(): string | undefined {
    const icsEvent = createEvent({
      start: dayjs(this.calEvent.startTime)
        .utc()
        .toArray()
        .slice(0, 6)
        .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray,
      startInputType: "utc",
      productId: "calendso/ics",
      title: this.t("ics_event_title", {
        eventType: this.calEvent.type,
        name: this.calEvent.attendees[0].name,
      }),
      description: this.getTextBody(
        this.t("request_reschedule_title_organizer", {
          attendee: this.calEvent.attendees[0].name,
        }),
        this.t("request_reschedule_subtitle_organizer", {
          attendee: this.calEvent.attendees[0].name,
        })
      ),
      duration: { minutes: dayjs(this.calEvent.endTime).diff(dayjs(this.calEvent.startTime), "minute") },
      organizer: { name: this.calEvent.organizer.name, email: this.calEvent.organizer.email },
      attendees: this.calEvent.attendees.map((attendee: Person) => ({
        name: attendee.name,
        email: attendee.email,
      })),
      status: "CANCELLED",
      method: "CANCEL",
    });
    if (icsEvent.error) {
      throw icsEvent.error;
    }
    return icsEvent.value;
  }

  // @OVERRIDE
  protected getTextBody(title = "", subtitle = "", extraInfo = "", callToAction = ""): string {
    return `
${this.t(title)}
${this.t(subtitle)}
${extraInfo}
${getRichDescription(this.calEvent)}
${callToAction}
`.trim();
  }
}
