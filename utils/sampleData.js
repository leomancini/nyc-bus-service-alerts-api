// Sample data for demo mode that matches MTA API structure
export function getSampleData() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  return {
    Siri: {
      ServiceDelivery: {
        SituationExchangeDelivery: [
          {
            Situations: {
              PtSituationElement: [
                {
                  Summary:
                    "B46 buses are delayed due to a family of unicorns blocking Utica Avenue. Rainbow cleanup crews en route.",
                  Description:
                    "A family of unicorns has decided to graze along Utica Avenue between Eastern Parkway and Avenue U, causing B46 buses to experience magical delays of up to 15 minutes. The Department of Mythical Creatures is negotiating with the unicorns using enchanted carrots. Passengers may experience glitter on their clothing.",
                  PublicationWindow: {
                    StartTime: oneHourAgo.toISOString(),
                    EndTime: new Date(
                      now.getTime() + 4 * 60 * 60 * 1000
                    ).toISOString()
                  },
                  CreationTime: oneHourAgo.toISOString(),
                  Affects: {
                    VehicleJourneys: {
                      AffectedVehicleJourney: [{ LineRef: "MTABC_B46" }]
                    }
                  }
                },
                {
                  Summary:
                    "M15-SBS service suspended between Houston St and 14th St due to Giant Robot vs Kaiju battle. Use teleportation pods as alternative.",
                  Description:
                    "A massive kaiju has emerged from the East River and is currently engaged in an epic battle with NYC's Defense Robot MechaBus Prime between Houston Street and 14th Street. M15-SBS Select Bus Service is suspended while civilians evacuate via emergency teleportation pods. The M14A, M14D, and M9 routes have been equipped with force fields for safe passage. Battle expected to conclude when one combatant needs a snack break.",
                  PublicationWindow: {
                    StartTime: twoHoursAgo.toISOString(),
                    EndTime: new Date(
                      now.getTime() + 6 * 60 * 60 * 1000
                    ).toISOString()
                  },
                  CreationTime: twoHoursAgo.toISOString(),
                  Affects: {
                    VehicleJourneys: {
                      AffectedVehicleJourney: [{ LineRef: "MTA NYCT_M15" }]
                    }
                  }
                },
                {
                  Summary:
                    "Q58 buses delayed 10-20 minutes due to time portal malfunction at Queens Boulevard. Temporal mechanics on scene.",
                  Description:
                    "A time portal accidentally opened at the intersection of Queens Boulevard and Woodhaven Boulevard, causing Q58 buses to get stuck in a temporal loop where they keep arriving 30 minutes ago. The Department of Temporal Affairs has deployed quantum mechanics to recalibrate the space-time continuum. Some passengers may experience déjà vu or remember tomorrow's lottery numbers.",
                  PublicationWindow: {
                    StartTime: thirtyMinutesAgo.toISOString(),
                    EndTime: new Date(
                      now.getTime() + 3 * 60 * 60 * 1000
                    ).toISOString()
                  },
                  CreationTime: thirtyMinutesAgo.toISOString(),
                  Affects: {
                    VehicleJourneys: {
                      AffectedVehicleJourney: [{ LineRef: "MTA NYCT_Q58" }]
                    }
                  }
                },
                {
                  Summary:
                    "B38 and B52 buses diverted via Atlantic Avenue due to spontaneous chocolate river on Fulton Street. Oompa Loompas responding.",
                  Description:
                    "A mysterious chocolate river has appeared on Fulton Street between Bedford Avenue and Nostrand Avenue after a magical candy factory explosion. B38 and B52 buses are being detoured via Atlantic Avenue to avoid getting stuck in the delicious molten goodness. Oompa Loompa cleanup crews are working around the clock with giant straws. Free samples available at bus stops, but passengers are advised not to drink directly from the street.",
                  PublicationWindow: {
                    StartTime: new Date(
                      now.getTime() - 45 * 60 * 1000
                    ).toISOString(),
                    EndTime: new Date(
                      now.getTime() + 8 * 60 * 60 * 1000
                    ).toISOString()
                  },
                  CreationTime: new Date(
                    now.getTime() - 45 * 60 * 1000
                  ).toISOString(),
                  Affects: {
                    VehicleJourneys: {
                      AffectedVehicleJourney: [
                        { LineRef: "MTABC_B38" },
                        { LineRef: "MTABC_B52" }
                      ]
                    }
                  }
                },
                {
                  Summary:
                    "M34-SBS will operate on Fairy Tale schedule tomorrow due to National Talk Like a Dragon Day. All announcements in Ancient Dragon.",
                  Description:
                    "In observance of National Talk Like a Dragon Day, M34-SBS Select Bus Service will operate on an enchanted Saturday schedule tomorrow. All bus announcements will be made in Ancient Dragon language (subtitles available via magical hearing aids at customer service). Buses may breathe small amounts of harmless fire when doors open. Knights in shining armor ride free with valid MetroCard. Regular human service will resume on Tuesday, weather permitting.",
                  PublicationWindow: {
                    StartTime: today.toISOString(),
                    EndTime: tomorrow.toISOString()
                  },
                  CreationTime: new Date(
                    today.getTime() - 2 * 60 * 60 * 1000
                  ).toISOString(),
                  Affects: {
                    VehicleJourneys: {
                      AffectedVehicleJourney: [{ LineRef: "MTA NYCT_M34" }]
                    }
                  }
                },
                {
                  Summary:
                    "S53 service suspended between Richmond Ave and Hylan Blvd due to bus transforming into giant butterfly. Lepidopterist en route.",
                  Description:
                    "S53 bus service is temporarily suspended between Richmond Avenue and Hylan Boulevard because Bus #5347 has spontaneously transformed into a magnificent 40-foot wingspan butterfly and refuses to move from its cocoon position in the middle of the road. The Department of Metamorphic Transportation has dispatched a specialist lepidopterist with a really big net. Passengers are advised to bring flowers to attract the bus-butterfly to alternative locations.",
                  PublicationWindow: {
                    StartTime: new Date(
                      now.getTime() - 20 * 60 * 1000
                    ).toISOString(),
                    EndTime: new Date(
                      now.getTime() + 2 * 60 * 60 * 1000
                    ).toISOString()
                  },
                  CreationTime: new Date(
                    now.getTime() - 20 * 60 * 1000
                  ).toISOString(),
                  Affects: {
                    VehicleJourneys: {
                      AffectedVehicleJourney: [{ LineRef: "MTA NYCT_S53" }]
                    }
                  }
                },
                {
                  Summary:
                    "Weekend service changes: Multiple Brooklyn bus routes switching to hovercraft mode for Annual Sky Bus Festival. Cloud parking available.",
                  Description:
                    "This weekend, several Brooklyn bus routes including B1, B6, B8, B15, B49, and B68 will temporarily convert to hovercraft mode for the Annual Sky Bus Festival. Buses will operate 500 feet above street level to provide scenic aerial tours while subway gnomes perform their traditional track-blessing ceremonies below. Extra floating bus stops will be deployed on nearby clouds during peak hours. Passengers afraid of heights may request teleportation assistance.",
                  PublicationWindow: {
                    StartTime: new Date(
                      today.getTime() + 24 * 60 * 60 * 1000
                    ).toISOString(), // Tomorrow
                    EndTime: new Date(
                      today.getTime() + 3 * 24 * 60 * 60 * 1000
                    ).toISOString() // 3 days from now
                  },
                  CreationTime: new Date(
                    today.getTime() - 6 * 60 * 60 * 1000
                  ).toISOString(),
                  Affects: {
                    VehicleJourneys: {
                      AffectedVehicleJourney: [
                        { LineRef: "MTABC_B1" },
                        { LineRef: "MTABC_B6" },
                        { LineRef: "MTABC_B8" },
                        { LineRef: "MTABC_B15" },
                        { LineRef: "MTABC_B49" },
                        { LineRef: "MTABC_B68" }
                      ]
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  };
}
