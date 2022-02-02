/**
 * @jest-environment jsdom
 */

import {screen, waitFor} from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import {bills} from "../fixtures/bills.js"
import {ROUTES, ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import mockStore from '../__mocks__/store.js'
import '@testing-library/jest-dom';

import router from "../app/Router.js";
import Bills from "../containers/Bills.js";
import store from "../app/Store.js";
import userEvent from "@testing-library/user-event";

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
    describe("When I am on Bills Page", () => {
        test("Then bill icon in vertical layout should be highlighted", async () => {

            Object.defineProperty(window, 'localStorage', {value: localStorageMock})
            window.localStorage.setItem('user', JSON.stringify({
                type: 'Employee'
            }))
            const root = document.createElement("div")
            root.setAttribute("id", "root")
            document.body.append(root)
            router()
            window.onNavigate(ROUTES_PATH.Bills)
            await waitFor(() => screen.getByTestId('icon-window'))
            const windowIcon = screen.getByTestId('icon-window')
            //to-do write expect expression
            //test if windowsIcon has class active-icon
            expect(windowIcon.classList.contains('active-icon')).toBe(true)

        })
        test("Then bills should be ordered from earliest to latest", () => {
            document.body.innerHTML = BillsUI({data: bills})
            const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
            const antiChrono = (a, b) => ((a < b) ? 1 : -1)
            const datesSorted = [...dates].sort(antiChrono)
            expect(dates).not.toEqual(datesSorted)
        })
    })
    describe('When I am on Bills page but it is loading', () => {
        test('Then I should land on a loading page', () => {
            document.body.innerHTML = BillsUI({data: [], loading: true});
            expect(screen.getAllByText('Loading...')).toBeTruthy();
        });
    });
    describe('When I am on Bills page but back-end send an error message', () => {
        test('Then I should land on an error page', () => {
            document.body.innerHTML = BillsUI({data: [], loading: false, error: 'Whoops!'});
            expect(screen.getAllByText('Erreur')).toBeTruthy();
        });
    });
    describe('When I click on new bill button', () => {
        test('Then I should go to the new bill form page', () => {
            const html = BillsUI({data: bills});
            const onNavigate = (pathname) => {
                document.body.innerHTML = ROUTES({pathname});
            };
            document.body.innerHTML = html;
            const container = new Bills({
                document,
                onNavigate,
                store,
                localStorage: window.localStorage,
            });

            const formTrigger = jest.fn(container.handleClickNewBill);
            const button = screen.getByTestId('btn-new-bill');

            button.addEventListener('click', formTrigger);

            userEvent.click(button);
            expect(formTrigger).toHaveBeenCalled();
            expect(screen.getByTestId('form-new-bill')).toBeTruthy();
        });
    });
    describe('When I click on eye icon', () => {
        test('Then it should open the bill modal with corresponding content', () => {
            $.fn.modal = jest.fn();
            document.body.innerHTML = BillsUI({data: bills});
            const onNavigate = (pathname) => {
                document.body.innerHTML = ROUTES({pathname});
            };
            const container = new Bills({
                document,
                onNavigate,
                store,
                localStorage: window.localStorage,
            });

            const iconEye = screen.getAllByTestId('icon-eye');
            const eye = iconEye[0];
            userEvent.click(eye);
            const modale = document.getElementById('modaleFile');
            const billUrl = eye.getAttribute('data-bill-url').split('?')[0];
            expect(modale.innerHTML.includes(billUrl)).toBeTruthy();
            expect(modale).toBeTruthy();
            expect($.fn.modal).toHaveBeenCalled();
        });
    });


    // GET BILLS
    describe('Get bills integration tests suites', () => {
        describe('When the app try to fetch datas from the API and when it succeeds', () => {
            test('Then it should return an array with the corresponding length', async () => {
                const getSpy = jest.spyOn(mockStore, 'bills');
                const bills = await mockStore.bills().list();

                expect(getSpy).toHaveBeenCalledTimes(1);
                expect(bills.length).toBe(4);
            });
        });

        // Integration test
        describe('When the app try to fetch datas from the API and when it fails', () => {
            beforeEach(() => {
                jest.spyOn(mockStore, 'bills')
                Object.defineProperty(
                    window,
                    'localStorage',
                    { value: localStorageMock }
                )
                window.localStorage.setItem('user', JSON.stringify({
                    type: 'Employee',
                    email: "a@a"
                }))
                const root = document.createElement("div")
                root.setAttribute("id", "root")
                document.body.append(root)
                router()
            })

            test('fetches bills from an API and fails with 404 message error', async () => {
                mockStore.bills.mockImplementationOnce(() => {
                    return {
                        list: () => {
                            return Promise.reject(new Error("Erreur 404"))
                        }
                    }
                })

                window.onNavigate(ROUTES_PATH.Bills)
                await new Promise(process.nextTick)
                const message = await screen.getByText(/Erreur 404/);
                expect(message).toBeTruthy()
            });
            test('fetches messages from an API and fails with 500 message error', async () => {
                mockStore.bills.mockImplementationOnce(() => {
                    return {
                        list: () => {
                            return Promise.reject(new Error('Erreur 500'));
                        }
                    }
                })

                window.onNavigate(ROUTES_PATH.Bills)
                await new Promise(process.nextTick)
                const message = await screen.getByText(/Erreur 500/);
                expect(message).toBeTruthy()
            });
        })
    });
})

