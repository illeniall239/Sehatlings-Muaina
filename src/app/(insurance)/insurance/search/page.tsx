"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Search,
    Building2,
    Users,
    FileText,
    AlertTriangle,
    ChevronRight,
    Loader2,
    ArrowLeft,
} from "lucide-react";
import type { Organization, PatientSearchResult } from "@/types/database";

export default function InsuranceSearchPage() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<string>("");
    const [searchName, setSearchName] = useState("");
    const [patients, setPatients] = useState<PatientSearchResult[]>([]);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Fetch organizations on mount
    useEffect(() => {
        async function fetchOrgs() {
            try {
                const res = await fetch("/api/organizations");
                const data = await res.json();
                if (data.organizations) {
                    setOrganizations(data.organizations);
                }
            } catch (error) {
                console.error("Failed to fetch organizations:", error);
            } finally {
                setIsLoadingOrgs(false);
            }
        }
        fetchOrgs();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrg || !searchName.trim()) return;

        setIsSearching(true);
        setHasSearched(true);

        try {
            const res = await fetch(
                `/api/insurance/patients?org_id=${selectedOrg}&name=${encodeURIComponent(searchName)}`
            );
            const data = await res.json();
            setPatients(data.patients || []);
        } catch (error) {
            console.error("Search failed:", error);
            setPatients([]);
        } finally {
            setIsSearching(false);
        }
    };

    const getClassificationColor = (classification: string) => {
        switch (classification) {
            case "critical":
                return "bg-destructive-100 text-destructive-700";
            case "abnormal":
                return "bg-warning-100 text-warning-700";
            default:
                return "bg-success-100 text-success-700";
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    href="/insurance"
                    className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
                    Patient Search
                </h1>
                <p className="text-neutral-500 mt-1">
                    Search patient records across linked laboratories
                </p>
            </div>

            {/* Search Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                            <Search className="h-5 w-5 text-primary-800" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-900">
                                Search Criteria
                            </h2>
                            <p className="text-sm text-neutral-500">
                                Select a lab and enter patient name
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Lab Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="organization" className="text-sm font-medium">
                                    Select Lab
                                </Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                    <select
                                        id="organization"
                                        value={selectedOrg}
                                        onChange={(e) => setSelectedOrg(e.target.value)}
                                        disabled={isLoadingOrgs}
                                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-neutral-200 bg-white text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                                    >
                                        <option value="">
                                            {isLoadingOrgs ? "Loading labs..." : "Choose a lab"}
                                        </option>
                                        {organizations.map((org) => (
                                            <option key={org.id} value={org.id}>
                                                {org.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Patient Name */}
                            <div className="space-y-2">
                                <Label htmlFor="patientName" className="text-sm font-medium">
                                    Patient Name
                                </Label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                    <Input
                                        id="patientName"
                                        placeholder="Enter patient name"
                                        value={searchName}
                                        onChange={(e) => setSearchName(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={!selectedOrg || !searchName.trim() || isSearching}
                            className="w-full md:w-auto"
                        >
                            {isSearching ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4" />
                                    Search Patients
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Results Section */}
            {hasSearched && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                                    <FileText className="h-5 w-5 text-neutral-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-neutral-900">
                                        Search Results
                                    </h2>
                                    <p className="text-sm text-neutral-500">
                                        {isSearching
                                            ? "Searching..."
                                            : `${patients.length} patient${patients.length !== 1 ? "s" : ""} found`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isSearching ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-2" />
                                <p className="text-neutral-500">Searching patient records...</p>
                            </div>
                        ) : patients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 mb-4">
                                    <Users className="h-6 w-6 text-neutral-400" />
                                </div>
                                <p className="text-neutral-600 font-medium">No patients found</p>
                                <p className="text-sm text-neutral-500 mt-1">
                                    Try a different search term or select another lab
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {patients.map((patient, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50/50 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-800 font-semibold">
                                                {patient.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-neutral-900">
                                                    {patient.name}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500">
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="h-3.5 w-3.5" />
                                                        {patient.report_count} report{patient.report_count !== 1 ? "s" : ""}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        Last: {new Date(patient.latest_report_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Classification Badge */}
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getClassificationColor(
                                                    patient.overall_classification
                                                )}`}
                                            >
                                                {patient.overall_classification === "critical" && (
                                                    <AlertTriangle className="h-3 w-3" />
                                                )}
                                                {patient.overall_classification.charAt(0).toUpperCase() +
                                                    patient.overall_classification.slice(1)}
                                            </span>

                                            {/* View Button */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-primary-800 hover:text-primary-900 hover:bg-primary-50"
                                                onClick={() => {
                                                    window.location.href = `/insurance/patient/${encodeURIComponent(patient.name)}?org_id=${selectedOrg}`;
                                                }}
                                            >
                                                View Summary
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
