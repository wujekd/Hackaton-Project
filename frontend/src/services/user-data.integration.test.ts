import { Timestamp } from "firebase/firestore";
import { afterEach, describe, expect, it } from "vitest";
import { auth } from "./firebase";
import { AuthService } from "./auth.service";
import { EventService } from "./event.service";
import { TimetableService } from "./timetable.service";
import { seedEmulatorUser, uniqueEmail } from "../test/firebaseEmulatorAdmin";

describe("User-owned Firestore data integration", () => {
  afterEach(async () => {
    if (auth.currentUser) {
      await AuthService.signOut();
    }

    window.localStorage.clear();
  });

  it("lets a verified user create, list, and delete timetable entries", async () => {
    const seededUser = await seedEmulatorUser({
      email: uniqueEmail("timetable-owner"),
      username: "Timetable Owner",
      verified: true,
    });

    await AuthService.signIn(seededUser.email, seededUser.password);

    const createdEntry = await TimetableService.createForUser(seededUser.uid, {
      title: "Algorithms",
      dayOfWeek: 2,
      startTime: "09:30",
      endTime: "11:00",
      location: "Room A1",
    });

    expect(createdEntry.startMinutes).toBe(570);

    const entries = await TimetableService.listForUser(seededUser.uid);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: createdEntry.id,
      title: "Algorithms",
      dayOfWeek: 2,
      startTime: "09:30",
      endTime: "11:00",
      startMinutes: 570,
      location: "Room A1",
    });

    await TimetableService.removeForUser(seededUser.uid, createdEntry.id);

    await expect(TimetableService.listForUser(seededUser.uid)).resolves.toEqual([]);
  });

  it("blocks an unverified user from creating timetable entries", async () => {
    const seededUser = await seedEmulatorUser({
      email: uniqueEmail("timetable-unverified"),
      username: "Unverified Timetable User",
      verified: false,
    });

    await AuthService.signIn(seededUser.email, seededUser.password);

    await expect(
      TimetableService.createForUser(seededUser.uid, {
        title: "Databases",
        dayOfWeek: 4,
        startTime: "13:00",
        endTime: "14:00",
        location: "Lab 4",
      }),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("blocks a signed-in user from reading another user's timetable", async () => {
    const owner = await seedEmulatorUser({
      email: uniqueEmail("timetable-read-owner"),
      username: "Read Owner",
      verified: true,
    });
    const intruder = await seedEmulatorUser({
      email: uniqueEmail("timetable-read-intruder"),
      username: "Read Intruder",
      verified: true,
    });

    await AuthService.signIn(owner.email, owner.password);
    await TimetableService.createForUser(owner.uid, {
      title: "Networks",
      dayOfWeek: 1,
      startTime: "10:00",
      endTime: "11:30",
      location: "Room N2",
    });

    await AuthService.signOut();
    await AuthService.signIn(intruder.email, intruder.password);

    await expect(TimetableService.listForUser(owner.uid)).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("lets a verified user manage their own event signups", async () => {
    const seededUser = await seedEmulatorUser({
      email: uniqueEmail("event-signup-owner"),
      username: "Signup Owner",
      verified: true,
    });

    await AuthService.signIn(seededUser.email, seededUser.password);

    const event = {
      id: "event-1",
      name: "Campus Mixer",
      description: "Meet other students",
      imageUrl: "",
      date: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    await EventService.signUp(seededUser.uid, event);
    await expect(EventService.isSignedUp(seededUser.uid, event.id)).resolves.toBe(true);

    const signups = await EventService.getSignups(seededUser.uid);
    expect(signups).toHaveLength(1);
    expect(signups[0]).toMatchObject({
      eventId: "event-1",
      eventName: "Campus Mixer",
      eventDescription: "Meet other students",
    });

    await EventService.cancelSignUp(seededUser.uid, event.id);
    await expect(EventService.isSignedUp(seededUser.uid, event.id)).resolves.toBe(false);
  });

  it("blocks an unverified user from signing up to events", async () => {
    const seededUser = await seedEmulatorUser({
      email: uniqueEmail("event-signup-unverified"),
      username: "Unverified Signup User",
      verified: false,
    });

    await AuthService.signIn(seededUser.email, seededUser.password);

    await expect(
      EventService.signUp(seededUser.uid, {
        id: "event-2",
        name: "Game Night",
        description: "Board games and pizza",
        imageUrl: "",
        date: Timestamp.now(),
        createdAt: Timestamp.now(),
      }),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("blocks a signed-in user from reading another user's event signups", async () => {
    const owner = await seedEmulatorUser({
      email: uniqueEmail("event-read-owner"),
      username: "Event Owner",
      verified: true,
    });
    const intruder = await seedEmulatorUser({
      email: uniqueEmail("event-read-intruder"),
      username: "Event Intruder",
      verified: true,
    });

    await AuthService.signIn(owner.email, owner.password);
    await EventService.signUp(owner.uid, {
      id: "event-3",
      name: "Hack Lab",
      description: "Late-night coding",
      imageUrl: "",
      date: Timestamp.now(),
      createdAt: Timestamp.now(),
    });

    await AuthService.signOut();
    await AuthService.signIn(intruder.email, intruder.password);

    await expect(EventService.getSignups(owner.uid)).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(EventService.isSignedUp(owner.uid, "event-3")).rejects.toMatchObject({
      code: "permission-denied",
    });
  });
});
