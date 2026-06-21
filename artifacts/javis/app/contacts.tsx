import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import colors from "@/constants/colors";
import { useMemory } from "@/contexts/MemoryContext";

const C = colors.dark;

interface Contact {
  id: string;
  name: string;
  initials: string;
  phones: string[];
  emails: string[];
  isFavorite?: boolean;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map(w => w[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

function getAvatarColor(name: string) {
  const colors = ["#CC0000", "#00AA44", "#0044CC", "#CC6600", "#6600CC", "#00AACC"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[h];
}

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { memory, updateMemory } = useMemory();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filtered, setFiltered] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [permDenied, setPermDenied] = useState(false);
  const [tab, setTab] = useState<"all" | "favorites">("all");

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    const list = tab === "favorites"
      ? contacts.filter(c => memory.favoriteContacts.includes(c.name))
      : contacts;
    const q = search.toLowerCase();
    setFiltered(q ? list.filter(c => c.name.toLowerCase().includes(q) || c.phones.some(p => p.includes(q))) : list);
  }, [search, contacts, tab, memory.favoriteContacts]);

  const loadContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setPermDenied(true);
        setLoading(false);
        loadMockContacts();
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        sort: Contacts.SortTypes.FirstName,
      });
      const parsed: Contact[] = data
        .filter(c => c.name)
        .map(c => ({
          id: c.id || Math.random().toString(36),
          name: c.name || "Unknown",
          initials: getInitials(c.name || ""),
          phones: (c.phoneNumbers || []).map(p => p.number || "").filter(Boolean),
          emails: (c.emails || []).map(e => e.email || "").filter(Boolean),
        }));
      setContacts(parsed);
    } catch (e) {
      loadMockContacts();
    } finally {
      setLoading(false);
    }
  };

  const loadMockContacts = () => {
    const mock: Contact[] = [
      { id: "1", name: "Tony Stark",   initials: "TS", phones: ["+1 555-0001"], emails: ["tony@starkindustries.com"] },
      { id: "2", name: "Pepper Potts", initials: "PP", phones: ["+1 555-0002"], emails: ["pepper@stark.com"] },
      { id: "3", name: "Nick Fury",    initials: "NF", phones: ["+1 555-0003"], emails: [] },
      { id: "4", name: "Bruce Banner", initials: "BB", phones: ["+1 555-0004"], emails: ["hulk@science.net"] },
      { id: "5", name: "Natasha R.",   initials: "NR", phones: ["+1 555-0005"], emails: [] },
      { id: "6", name: "James Rhodes", initials: "JR", phones: ["+1 555-0006"], emails: [] },
    ];
    setContacts(mock);
  };

  const callContact = useCallback((phone: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(`Call ${name}`, phone, [
      { text: "Cancel", style: "cancel" },
      { text: "Call", onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  }, []);

  const messageContact = useCallback((phone: string) => {
    Linking.openURL(`sms:${phone}`);
  }, []);

  const toggleFavorite = useCallback(async (contact: Contact) => {
    Haptics.selectionAsync();
    const favs = [...memory.favoriteContacts];
    const idx = favs.indexOf(contact.name);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.unshift(contact.name);
    await updateMemory({ favoriteContacts: favs });
  }, [memory.favoriteContacts, updateMemory]);

  const renderItem = ({ item }: { item: Contact }) => {
    const isFav = memory.favoriteContacts.includes(item.name);
    const phone = item.phones[0] || "";
    const color = getAvatarColor(item.name);

    return (
      <View style={styles.contactRow}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{item.initials}</Text>
          {isFav && <View style={styles.favDot} />}
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          {phone ? (
            <Text style={styles.contactPhone}>{phone}</Text>
          ) : (
            <Text style={[styles.contactPhone, { opacity: 0.4 }]}>No phone</Text>
          )}
        </View>

        <View style={styles.contactActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "rgba(0,255,68,0.1)" }]}
            onPress={() => phone ? callContact(phone, item.name) : null}
            disabled={!phone}
          >
            <Feather name="phone" size={15} color={phone ? "#00FF44" : "#444444"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "rgba(68,136,255,0.1)" }]}
            onPress={() => phone ? messageContact(phone) : null}
            disabled={!phone}
          >
            <Feather name="message-circle" size={15} color={phone ? "#4488FF" : "#444444"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isFav && { backgroundColor: "rgba(204,0,0,0.15)" }]}
            onPress={() => toggleFavorite(item)}
          >
            <Feather name={isFav ? "star" : "star"} size={15} color={isFav ? C.primary : "#444444"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={C.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>CONTACTS</Text>
          <Text style={styles.headerSub}>{contacts.length} contacts</Text>
        </View>
        <TouchableOpacity onPress={loadContacts} style={styles.backBtn}>
          <Feather name="refresh-cw" size={18} color={C.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Feather name="search" size={16} color={C.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search contacts..."
          placeholderTextColor={C.mutedForeground}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={C.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["all", "favorites"] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Feather
              name={t === "all" ? "users" : "star"}
              size={13}
              color={tab === t ? C.primary : C.mutedForeground}
            />
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === "all" ? "ALL" : "FAVORITES"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {permDenied && (
        <View style={styles.permBanner}>
          <Feather name="alert-circle" size={14} color="#FF8800" />
          <Text style={styles.permText}>Demo mode — grant contacts permission for real contacts</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={48} color={C.mutedForeground} />
          <Text style={styles.emptyText}>No contacts found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 8, width: 40 },
  headerTitle: {
    color: C.primary,
    fontSize: 14,
    fontFamily: "Orbitron_700Bold",
    letterSpacing: 3,
  },
  headerSub: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#0A0A0A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: "rgba(204,0,0,0.12)",
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  tabLabel: {
    color: C.mutedForeground,
    fontSize: 11,
    fontFamily: "Orbitron_400Regular",
    letterSpacing: 1,
  },
  tabLabelActive: { color: C.primary },
  permBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "rgba(255,136,0,0.1)",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,136,0,0.3)",
  },
  permText: { color: "#FF8800", fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: C.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 },
  emptyText: { color: C.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0D0D0D",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  favDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
    borderWidth: 1.5,
    borderColor: "#000000",
  },
  contactInfo: { flex: 1 },
  contactName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  contactPhone: {
    color: C.mutedForeground,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  contactActions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1F1F1F",
  },
});
