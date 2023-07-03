import TicketTypeRequest from "../src/pairtest/lib/TicketTypeRequest";
import TicketService from "../src/pairtest/TicketService";
import { jest } from "@jest/globals";
import TicketPaymentService from "../src/thirdparty/paymentgateway/TicketPaymentService";
import SeatReservationService from "../src/thirdparty/seatbooking/SeatReservationService";

describe("Ticket Service Tests", () => {
  const ticketService = new TicketService();

  describe("Account ID checks", () => {
    test.each([-1, null, {}, [], "strings"])(
      "Only accepts valid account IDs",
      (accountId) => {
        expect(() =>
          ticketService.purchaseTickets(
            accountId,
            new TicketTypeRequest("ADULT", 1)
          )
        ).toThrowError("Your account details are invalid.");
      }
    );
  });

  describe("Valid ticket request checks", () => {
    test("Only process ticket orders containing ticket requests", () => {
      expect(() => ticketService.purchaseTickets(1)).toThrowError(
        "You have not purchased any tickets."
      );
    });

    test("Should not accept invalid ticket types", () => {
      expect(() => ticketService.purchaseTickets(1, {}, {})).toThrowError(
        "Please request valid ticket types."
      );
      expect(() =>
        ticketService.purchaseTickets(1, {}, new TicketTypeRequest("ADULT", 1))
      ).toThrowError("Please request valid ticket types.");
    });

    test("Should not accept incorrect ticket types", () => {
      expect(() =>
        ticketService.purchaseTickets(1, {}, new TicketTypeRequest("SENIOR", 1))
      ).toThrowError(TypeError);
      expect(() =>
        ticketService.purchaseTickets(
          1,
          {},
          new TicketTypeRequest("ADULT", "one")
        )
      ).toThrowError(TypeError);
    });

    test("Should not accept invalid ticket purchase amounts of 0 or greater than 20", () => {
      expect(() =>
        ticketService.purchaseTickets(1, new TicketTypeRequest("ADULT", 0))
      ).toThrowError("You have not purchased any tickets.");
      expect(() =>
        ticketService.purchaseTickets(1, new TicketTypeRequest("ADULT", 21))
      ).toThrowError("You are not permitted to request more than 20 tickets.");
      expect(() =>
        ticketService.purchaseTickets(
          1,
          new TicketTypeRequest("ADULT", 9),
          new TicketTypeRequest("ADULT", 12)
        )
      ).toThrowError("You are not permitted to request more than 20 tickets.");
    });
  });

  describe("Ensure adult supervision requirements are met", () => {
    test("Should ensure every infant has an adult to supervise them", () => {
      expect(() =>
        ticketService.purchaseTickets(
          1,
          new TicketTypeRequest("ADULT", 1),
          new TicketTypeRequest("INFANT", 2)
        )
      ).toThrowError("Every infant must be supervised by an adult.");
    });

    test("Should prevent children/infants from booking without adults", () => {
      expect(() =>
        ticketService
          .purchaseTickets(1, new TicketTypeRequest("CHILD", 1))
          .toThrowError("Children/infants cannot book without an adult.")
      );
      expect(() =>
        ticketService.purchaseTickets(1, new TicketTypeRequest("INFANT", 1))
      ).toThrowError("Every infant must be supervised by an adult.");
    });
  });

  describe("Costs are calculated correctly", () => {
    test("Payment values should match expected costs", () => {
      const accountId = 1;

      let correctPrice = 20;
      const makePayment = jest.spyOn(
        TicketPaymentService.prototype,
        "makePayment"
      );
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 1)
      );
      expect(makePayment).toHaveBeenCalledWith(accountId, correctPrice);

      correctPrice = 20;
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 1),
        new TicketTypeRequest("CHILD", 0)
      );

      correctPrice = 20;
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 1),
        new TicketTypeRequest("INFANT", 0)
      );
      expect(makePayment).toHaveBeenCalledWith(accountId, correctPrice);

      correctPrice = 20;
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 1),
        new TicketTypeRequest("CHILD", 0),
        new TicketTypeRequest("INFANT", 0)
      );
      expect(makePayment).toHaveBeenCalledWith(accountId, correctPrice);

      correctPrice = 100;
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 4),
        new TicketTypeRequest("CHILD", 2)
      );
      expect(makePayment).toHaveBeenCalledWith(accountId, correctPrice);

      correctPrice = 220;
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 10),
        new TicketTypeRequest("CHILD", 2),
        new TicketTypeRequest("INFANT", 3)
      );
      expect(makePayment).toHaveBeenCalledWith(accountId, correctPrice);
    });
  });

  describe("Seat reservations are calculated correctly", () => {
    test("Should return correct seat number", () => {
      const accountId = 1;
      let seatNumber = 1;
      const seatReservation = jest.spyOn(
        SeatReservationService.prototype,
        "reserveSeat"
      );
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 1)
      );
      expect(seatReservation).toHaveBeenCalledWith(accountId, seatNumber);

      seatNumber = 2;
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 1),
        new TicketTypeRequest("CHILD", 1)
      );
      expect(seatReservation).toHaveBeenCalledWith(accountId, seatNumber);

      seatNumber = 1;
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 1),
        new TicketTypeRequest("INFANT", 1)
      );
      expect(seatReservation).toHaveBeenCalledWith(accountId, seatNumber);

      seatNumber = 1;
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 1),
        new TicketTypeRequest("CHILD", 0),
        new TicketTypeRequest("INFANT", 0)
      );
      expect(seatReservation).toHaveBeenCalledWith(accountId, seatNumber);

      seatNumber = 3;
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 2),
        new TicketTypeRequest("CHILD", 1),
        new TicketTypeRequest("INFANT", 2)
      );
      expect(seatReservation).toHaveBeenCalledWith(accountId, seatNumber);

      seatNumber = 15;
      ticketService.purchaseTickets(
        accountId,
        new TicketTypeRequest("ADULT", 10),
        new TicketTypeRequest("CHILD", 5),
        new TicketTypeRequest("INFANT", 5)
      );
      expect(seatReservation).toHaveBeenCalledWith(accountId, seatNumber);
    });
  });
});
