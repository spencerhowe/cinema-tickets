import TicketTypeRequest from "./lib/TicketTypeRequest.js";
import InvalidPurchaseException from "./lib/InvalidPurchaseException.js";
import TicketPaymentService from "../thirdparty/paymentgateway/TicketPaymentService.js";
import SeatReservationService from "../thirdparty/seatbooking/SeatReservationService.js";

export default class TicketService {
  ticketPrice = {
    adult: 20,
    child: 10,
    infact: 0,
  };

  #calculatePurchaseAmount(adult, child) {
    return this.ticketPrice.adult * adult + this.ticketPrice.child * child;
  }

  #calculateSeatReservation(adult, child) {
    return adult + child;
  }

  #checkAccountValidity(accountId) {
    if (accountId < 0 || typeof accountId !== "number") {
      throw new InvalidPurchaseException("Your account details are invalid.");
    }
  }

  #checkTicketRequests(requestedTickets) {
    const totalNumberOfTickets = Object.values(requestedTickets).reduce(
      (a, b) => a + b,
      0
    );

    if (totalNumberOfTickets == 0) {
      throw new InvalidPurchaseException("You have not purchased any tickets.");
    }

    if (totalNumberOfTickets > 20) {
      throw new InvalidPurchaseException(
        "You are not permitted to request more than 20 tickets."
      );
    }

    if (requestedTickets.infant > requestedTickets.adult) {
      throw new InvalidPurchaseException(
        "Every infant must be supervised by an adult."
      );
    }

    if (!requestedTickets.adult) {
      throw new InvalidPurchaseException(
        "Children/infants cannot book without an adult."
      );
    }
  }

  purchaseTickets(accountId, ...ticketTypeRequests) {
    this.#checkAccountValidity(accountId);

    let requestedTickets = {
      adult: 0,
      child: 0,
      infant: 0,
    };

    ticketTypeRequests.forEach((ticketTypeRequest) => {
      if (!(ticketTypeRequest instanceof TicketTypeRequest)) {
        throw new InvalidPurchaseException(
          "Please request valid ticket types."
        );
      }

      const ticketType = ticketTypeRequest.getTicketType().toLowerCase();
      const numberOfTickets = ticketTypeRequest.getNoOfTickets();
      requestedTickets[ticketType] += numberOfTickets;
    });

    this.#checkTicketRequests(requestedTickets);

    const purchaseAmount = this.#calculatePurchaseAmount(
      requestedTickets.adult,
      requestedTickets.child
    );

    const numberOfSeats = this.#calculateSeatReservation(
      requestedTickets.adult,
      requestedTickets.child
    );

    new SeatReservationService().reserveSeat(accountId, numberOfSeats);
    new TicketPaymentService().makePayment(accountId, purchaseAmount);
  }
}
