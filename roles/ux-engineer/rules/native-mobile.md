# Native mobile rules

Load this when the project ships an iOS or Android app rather than a web surface.

**A native app is not the web at different dimensions.** It has two sets of platform conventions, two
release pipelines, two review authorities, and one of the two cannot roll back the way the web can.

---

## Two guideline sets, and the differences are not cosmetic

Apple HIG and Material are not interchangeable. Where they differ, **pick deliberately and record why**;
a design that silently follows one on both platforms is broken on the other.

| Concern | Where it bites |
|---|---|
| Navigation model | Tab bar versus bottom navigation, and where the title lives |
| **Back** | **Android has a system back gesture.** A design relying only on an on-screen back button is broken on Android, including inside sheets and modals |
| Sheets and modals | Presentation, dismissal, and what the system does to them |
| Typography defaults | Dynamic Type on iOS is a user setting, not a suggestion |
| Control heights | The platform minimum is a floor, not a target |

---

## Safe areas are chrome, and chrome is declared

Notch, dynamic island, home indicator, gesture bar. Each is a declared `chrome` entry per viewport with
`pinH` and `pinV`, exactly as a web top-nav is.

**Never assume a safe area.** A screen designed against a rectangle loses its first and last rows on
the devices people actually own.

---

## The device matrix, and where it breaks

Declare at least: the **smallest supported phone**, the largest phone, and a tablet if supported.

The smallest is where the design breaks and it is the one that gets skipped. A layout drawn at 390pt
and shipped to a 320pt device loses content silently, because the frame clips it.

---

## Store assets are design work, not an export

The icon at every required size, and screenshots at every required device size. **These are the first
thing a user sees**, before the product, and they are frequently made in the last hour before
submission by someone who was not the designer.

They belong in the screen inventory and in the estimate.

---

## Release: the asymmetry that changes planning

| | iOS | Android |
|---|---|---|
| Beta channel | TestFlight: 100 internal, 10,000 external | Play tracks: internal, closed, open |
| Beta review | **External builds are reviewed, roughly 48 hours** | Internal testing is near-instant, **no review** |
| Build lifetime | **TestFlight builds expire after 90 days** | No equivalent expiry |
| Store review | App Review questionnaire: permissions, encryption, content | Policy review, usually faster |
| **Staged rollout** | **Not natively available** | Percentage-based |
| Signing | Distribution certificate, provisioning profile | Upload key, app signing key |

**Android can release to 1% of users and stop. iOS cannot.**

A bad iOS release is fixed by shipping another build and waiting for review again, so **the cost of an
iOS defect is measured in days, not minutes.** Two consequences:

- **iOS review latency is a scheduled line item at 5.1, not a risk.** It is not uncertain, it is known
  and it is slow
- The pre-release evaluation at 3.8 and 3.9 is worth more on iOS than anywhere else in this flow,
  because it is the last cheap place to find anything

---

## Signing keys are a single point of catastrophe

**Losing the Android app signing key means the app can never be updated under the same listing again.**
Not "is difficult to recover". Cannot.

This belongs in the architecture and in the Account's ownership table, not in a deployment checklist
nobody reads. Custody, backup location, and who has access, recorded before the first release.

---

## Definition of done

**Design**

- [ ] HIG and Material conventions honoured where they differ, deliberately, recorded
- [ ] Safe areas declared as `chrome` per device class, never assumed
- [ ] Smallest supported device has no overflow and no clipped text
- [ ] Android system back tested on every screen, including sheets and modals
- [ ] Dynamic Type or equivalent scaling tested at the largest setting
- [ ] Store icon and screenshots produced at every required size, and in the inventory

**Release**

- [ ] Signing keys in a secret manager **and backed up off-machine**
- [ ] Custody recorded in the ownership table
- [ ] Internal track build installed on a **real device**, both platforms
- [ ] App Review questionnaire answered honestly: permissions, encryption, content
- [ ] Privacy labels match what the app actually collects
- [ ] Android production configured as a **staged rollout**, not 100%
- [ ] Crash reporting live before the first external tester
- [ ] iOS review latency present in the schedule at 5.1
